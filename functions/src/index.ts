import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// ---- Cheat / Bot Detection configuration ----
// Response time thresholds (in milliseconds)
const FAST_RESPONSE_THRESHOLD_MS = 800; // "too fast" individual answers
const LOW_AVG_RESPONSE_THRESHOLD_MS = 1500; // suspiciously low average

// Behavioral thresholds
const FAST_ANSWER_MIN_COUNT = 3; // number of ultra-fast answers before it matters
const HIGH_ACCURACY_THRESHOLD = 0.95; // 95%+ accuracy
const COLLISION_WINDOW_MS = 2000; // identical answer window between players
const COLLISION_MIN_COUNT = 3; // how many collisions before considered suspicious

interface AnswerRecord {
  answer?: any;
  isCorrect?: boolean;
  score?: number;
  answeredAt?: string;
  submissionTime?: number; // ms timestamp from client
  responseTimeMs?: number; // ms between question shown and answer (client-estimated)
}

interface CheatStats {
  totalAnswers: number;
  avgResponseTimeMs: number;
  fastAnswerCount: number;
  identicalAnswerCollisions: number;
  accuracy: number;
}

async function evaluateCheatRisk(quizId: string, playerId: string): Promise<void> {
  try {
    const playerRef = db.doc(`quizzes/${quizId}/players/${playerId}`);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      console.log(`[cheatDetection] Player ${playerId} not found for quiz ${quizId}`);
      return;
    }

    const playerData = playerSnap.data() || {};
    const rawAnswers: unknown = playerData.answers;
    const answers: AnswerRecord[] = Array.isArray(rawAnswers)
      ? (rawAnswers.filter((a) => a && typeof a === "object") as AnswerRecord[])
      : [];

    const totalAnswers = answers.length;

    // If no answers, store a neutral record and exit
    if (totalAnswers === 0) {
      await db.doc(`quizzes/${quizId}/ai/cheatFlags/${playerId}`).set(
        {
          playerId,
          riskScore: 0,
          reasons: [],
          lastEvaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stats: {
            totalAnswers: 0,
            avgResponseTimeMs: 0,
            fastAnswerCount: 0,
            identicalAnswerCollisions: 0,
            accuracy: 0,
          },
        },
        { merge: true },
      );
      return;
    }

    // --- Basic per-player stats ---
    let fastAnswerCount = 0;
    let correctCount = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const ans of answers) {
      const rt = typeof ans.responseTimeMs === "number" ? ans.responseTimeMs : undefined;
      if (typeof ans.isCorrect === "boolean" && ans.isCorrect) {
        correctCount++;
      }
      if (rt !== undefined && rt >= 0) {
        totalResponseTime += rt;
        responseCount++;
        if (rt < FAST_RESPONSE_THRESHOLD_MS) {
          fastAnswerCount++;
        }
      }
    }

    const avgResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const accuracy = totalAnswers > 0 ? correctCount / totalAnswers : 0;

    // --- Pattern similarity across players (identical answer collisions) ---
    const playersSnapshot = await db
      .collection(`quizzes/${quizId}/players`)
      .get();

    interface QuestionAnswerEntry {
      playerId: string;
      questionIndex: number;
      answer: any;
      submissionTime?: number;
    }

    const questionAnswers: QuestionAnswerEntry[] = [];

    playersSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const playerAnswers: AnswerRecord[] = Array.isArray(data.answers)
        ? (data.answers.filter((a: unknown) => a && typeof a === "object") as AnswerRecord[])
        : [];

      playerAnswers.forEach((ans, index) => {
        if (ans.answer !== undefined) {
          questionAnswers.push({
            playerId: docSnap.id,
            questionIndex: index,
            answer: ans.answer,
            submissionTime: typeof ans.submissionTime === "number" ? ans.submissionTime : undefined,
          });
        }
      });
    });

    let identicalAnswerCollisions = 0;

    // For simplicity, count for the current player how many of their answers collide
    // with at least one other player on the same question, same answer, and within the time window.
    const playerAnswersForCollision = questionAnswers.filter((qa) => qa.playerId === playerId);

    for (const pa of playerAnswersForCollision) {
      if (pa.submissionTime === undefined) continue;
      const collisionsForThisAnswer = questionAnswers.some((other) => {
        if (other.playerId === playerId) return false;
        if (other.questionIndex !== pa.questionIndex) return false;
        if (other.answer !== pa.answer) return false;
        if (other.submissionTime === undefined) return false;
        return (
          Math.abs(other.submissionTime - pa.submissionTime) <= COLLISION_WINDOW_MS
        );
      });
      if (collisionsForThisAnswer) {
        identicalAnswerCollisions++;
      }
    }

    const stats: CheatStats = {
      totalAnswers,
      avgResponseTimeMs,
      fastAnswerCount,
      identicalAnswerCollisions,
      accuracy,
    };

    // --- Risk scoring ---
    let riskScore = 0;
    const reasons: string[] = [];

    if (fastAnswerCount >= FAST_ANSWER_MIN_COUNT) {
      riskScore += 0.3;
      reasons.push("Too many ultra-fast answers");
    }

    if (
      accuracy >= HIGH_ACCURACY_THRESHOLD &&
      avgResponseTimeMs > 0 &&
      avgResponseTimeMs <= LOW_AVG_RESPONSE_THRESHOLD_MS
    ) {
      riskScore += 0.5;
      reasons.push("High accuracy with very low response time");
    }

    if (identicalAnswerCollisions >= COLLISION_MIN_COUNT) {
      riskScore += 0.4;
      reasons.push("Suspiciously similar answers to other players");
    }

    // Clamp between 0 and 1
    riskScore = Math.min(1, Math.max(0, riskScore));

    await db
      .doc(`quizzes/${quizId}/ai/cheatFlags/${playerId}`)
      .set(
        {
          playerId,
          riskScore,
          reasons,
          lastEvaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stats,
        },
        { merge: true },
      );

    console.log(
      `[cheatDetection] Evaluated cheat risk for player ${playerId} in quiz ${quizId}: score=${riskScore.toFixed(2)}`,
    );
  } catch (err) {
    console.error(
      `[cheatDetection] Failed to evaluate cheat risk for player ${playerId} in quiz ${quizId}:`,
      err,
    );
  }
}

// Cloud Function to calculate leaderboard
export const calculateLeaderboard = functions.firestore
  .document("quizzes/{quizId}/players/{playerId}")
  .onWrite(async (change, context) => {
    const quizId = context.params.quizId;
    const playerId = context.params.playerId;
    
    try {
      // Get all players for this quiz
      const playersSnapshot = await db
        .collection(`quizzes/${quizId}/players`)
        .orderBy("score", "desc")
        .get();
      
      const leaderboard: any[] = [];
      playersSnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          id: doc.id,
          name: data.name,
          score: data.score || 0,
          joinedAt: data.joinedAt
        });
      });
      
      // Update the quiz document with the leaderboard
      await db.doc(`quizzes/${quizId}`).update({
        leaderboard: leaderboard,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Leaderboard updated for quiz ${quizId}`);

      // After updating leaderboard, evaluate cheat / bot risk for this player
      if (change.after.exists) {
        await evaluateCheatRisk(quizId, playerId);
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  });

// Cloud Function to handle quiz state changes
export const onQuizStatusChange = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change, context) => {
    const quizId = context.params.quizId;
    const before = change.before.data();
    const after = change.after.data();
    
    // If quiz status changed to finished, calculate final scores
    if (before.status !== "finished" && after.status === "finished") {
      try {
        const playersSnapshot = await db
          .collection(`quizzes/${quizId}/players`)
          .get();
        
        const finalScores: any[] = [];
        playersSnapshot.forEach((doc) => {
          const data = doc.data();
          finalScores.push({
            playerId: doc.id,
            name: data.name,
            finalScore: data.score || 0,
            totalAnswers: Object.keys(data.answers || {}).length
          });
        });
        
        // Sort by score
        finalScores.sort((a, b) => b.finalScore - a.finalScore);
        
        // Update quiz with final results
        await db.doc(`quizzes/${quizId}`).update({
          finalScores: finalScores,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Final scores calculated for quiz ${quizId}`);
      } catch (error) {
        console.error("Error calculating final scores:", error);
      }
    }
  });

// HTTP Cloud Function to get quiz statistics
export const getQuizStats = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  
  try {
    const quizzesSnapshot = await db.collection("quizzes").get();
    
    let totalQuizzes = 0;
    let activeQuizzes = 0;
    let completedQuizzes = 0;
    let totalPlayers = 0;
    
    for (const doc of quizzesSnapshot.docs) {
      const data = doc.data();
      totalQuizzes++;
      
      if (data.status === "active") {
        activeQuizzes++;
      } else if (data.status === "finished") {
        completedQuizzes++;
      }
      
      // Count players in this quiz
      const playersSnapshot = await db
        .collection(`quizzes/${doc.id}/players`)
        .get();
      totalPlayers += playersSnapshot.size;
    }
    
    res.json({
      totalQuizzes,
      activeQuizzes,
      completedQuizzes,
      totalPlayers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting quiz stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cloud Function to clean up old quizzes
export const cleanupOldQuizzes = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago
    
    try {
      const oldQuizzesSnapshot = await db
        .collection("quizzes")
        .where("createdAt", "<", cutoffDate)
        .where("status", "==", "finished")
        .get();
      
      const batch = db.batch();
      
      for (const doc of oldQuizzesSnapshot.docs) {
        // Delete players subcollection
        const playersSnapshot = await db
          .collection(`quizzes/${doc.id}/players`)
          .get();
        
        playersSnapshot.forEach((playerDoc) => {
          batch.delete(playerDoc.ref);
        });
        
        // Delete quiz document
        batch.delete(doc.ref);
      }
      
      await batch.commit();
      console.log(`Cleaned up ${oldQuizzesSnapshot.size} old quizzes`);
    } catch (error) {
      console.error("Error cleaning up old quizzes:", error);
    }
  });
