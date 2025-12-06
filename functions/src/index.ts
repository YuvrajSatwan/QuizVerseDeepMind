import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Cloud Function to calculate leaderboard
export const calculateLeaderboard = functions.firestore
  .document("quizzes/{quizId}/players/{playerId}")
  .onWrite(async (change, context) => {
    const quizId = context.params.quizId;
    
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
