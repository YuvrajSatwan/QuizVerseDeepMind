import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Calculate leaderboard when quiz status changes
export const calculateLeaderboard = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return;

    // Only calculate when quiz ends
    if (oldData.status !== "ended" && newData.status === "ended") {
      const quizId = context.params.quizId;
      const playersRef = admin.firestore().collection(`quizzes/${quizId}/players`);
      const playersSnapshot = await playersRef.get();

      const leaderboard: any[] = [];
      playersSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        const playerData = doc.data();
        leaderboard.push({
          id: doc.id,
          name: playerData.name,
          score: playerData.score || 0,
          joinedAt: playerData.joinedAt
        });
      });

      // Sort by score (desc), then by join time (asc)
      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.joinedAt.toMillis() - b.joinedAt.toMillis();
      });

      // Update quiz with leaderboard
      await admin.firestore().collection("quizzes").doc(quizId).update({
        leaderboard,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Handle quiz status changes
export const onQuizStatusChange = functions.firestore
  .document("quizzes/{quizId}")
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return;

    const quizId = context.params.quizId;

    // Start quiz automatically after 30 seconds if enough players
    if (oldData.status === "waiting" && newData.status === "waiting") {
      const playersRef = admin.firestore().collection(`quizzes/${quizId}/players`);
      const playersSnapshot = await playersRef.get();

      if (playersSnapshot.size >= 2) {
        setTimeout(async () => {
          const quizDoc = await admin.firestore().collection("quizzes").doc(quizId).get();
          if (quizDoc.exists && quizDoc.data()?.status === "waiting") {
            await admin.firestore().collection("quizzes").doc(quizId).update({
              status: "active",
              startedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }, 30000);
      }
    }
  });

// API endpoint for quiz statistics
export const getQuizStats = functions.https.onRequest(async (req: functions.Request, res: functions.Response) => {
  try {
    const quizzesSnapshot = await admin.firestore().collection("quizzes").get();
    
    const stats = {
      totalQuizzes: quizzesSnapshot.size,
      activeQuizzes: 0,
      completedQuizzes: 0,
      totalPlayers: 0
    };

    for (const doc of quizzesSnapshot.docs) {
      const data = doc.data();
      if (data.status === "active" || data.status === "waiting") {
        stats.activeQuizzes++;
      } else if (data.status === "ended") {
        stats.completedQuizzes++;
      }

      // Count players in this quiz
      const playersSnapshot = await admin.firestore()
        .collection(`quizzes/${doc.id}/players`)
        .get();
      stats.totalPlayers += playersSnapshot.size;
    }

    res.json(stats);
  } catch (error) {
    console.error("Error getting quiz stats:", error);
    res.status(500).json({error: "Failed to get stats"});
  }
});

// Cleanup old quizzes (runs weekly)
export const cleanupOldQuizzes = functions.pubsub
  .schedule("0 0 * * 0")
  .timeZone("UTC")
  .onRun(async (context: functions.EventContext) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oldQuizzesSnapshot = await admin.firestore()
      .collection("quizzes")
      .where("createdAt", "<", oneWeekAgo)
      .where("status", "==", "ended")
      .get();

    const batch = admin.firestore().batch();
    
    for (const doc of oldQuizzesSnapshot.docs) {
      // Delete players subcollection
      const playersSnapshot = await admin.firestore()
        .collection(`quizzes/${doc.id}/players`)
        .get();
      
      playersSnapshot.forEach((playerDoc: admin.firestore.QueryDocumentSnapshot) => {
        batch.delete(playerDoc.ref);
      });
      
      // Delete quiz document
      batch.delete(doc.ref);
    }

    await batch.commit();
    console.log(`Cleaned up ${oldQuizzesSnapshot.size} old quizzes`);
  });
