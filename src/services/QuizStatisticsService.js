import { 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  addDoc, 
  arrayUnion, 
  getDoc, 
  setDoc 
} from 'firebase/firestore'
import { db } from '../firebase/config'

class QuizStatisticsService {
  // Initialize statistics for a new quiz
  async initializeQuizStatistics(quizId, questionsCount) {
    try {
      // Create a statistics document for the quiz
      await setDoc(doc(db, 'quizStatistics', quizId), {
        quizId,
        participantsCount: 0,
        questionsCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalAnswersSubmitted: 0,
        isActive: true
      })

      // Initialize question-specific statistics
      for (let i = 0; i < questionsCount; i++) {
        await setDoc(doc(db, `quizStatistics/${quizId}/questions`, `question_${i}`), {
          questionIndex: i,
          totalAnswers: 0,
          answerDistribution: {},
          correctCount: 0,
          incorrectCount: 0,
          accuracyRate: 0,
          responseTime: {
            fastest: null,
            slowest: null,
            average: null,
            total: 0
          }
        })
      }

      console.log('📊 Quiz statistics initialized for quiz:', quizId)
      return true
    } catch (error) {
      console.error('Error initializing quiz statistics:', error)
      return false
    }
  }

  // Record a participant's answer
  async recordAnswer(quizId, questionIndex, playerId, answerIndex, isCorrect, responseTimeMs) {
    try {
      const questionDocRef = doc(db, `quizStatistics/${quizId}/questions`, `question_${questionIndex}`)
      const questionDoc = await getDoc(questionDocRef)

      if (!questionDoc.exists()) {
        console.error(`Question statistics document doesn't exist for question ${questionIndex}`)
        return false
      }

      const questionData = questionDoc.data()
      const currentDistribution = questionData.answerDistribution || {}
      const currentCount = currentDistribution[answerIndex] || 0

      // Update answer distribution
      const updates = {
        totalAnswers: increment(1),
        [`answerDistribution.${answerIndex}`]: increment(1),
        updatedAt: serverTimestamp()
      }

      // Update correct/incorrect counts
      if (isCorrect) {
        updates.correctCount = increment(1)
      } else {
        updates.incorrectCount = increment(1)
      }

      // Update response time statistics
      if (responseTimeMs) {
        const fastest = questionData.responseTime.fastest
        const slowest = questionData.responseTime.slowest
        const total = questionData.responseTime.total || 0
        const count = questionData.totalAnswers || 0
        
        updates['responseTime.total'] = total + responseTimeMs
        
        if (fastest === null || responseTimeMs < fastest) {
          updates['responseTime.fastest'] = responseTimeMs
        }
        
        if (slowest === null || responseTimeMs > slowest) {
          updates['responseTime.slowest'] = responseTimeMs
        }
        
        // Calculate new average
        updates['responseTime.average'] = Math.round((total + responseTimeMs) / (count + 1))
      }

      // Calculate new accuracy rate
      const newTotalAnswers = questionData.totalAnswers + 1
      const newCorrectCount = questionData.correctCount + (isCorrect ? 1 : 0)
      updates.accuracyRate = Math.round((newCorrectCount / newTotalAnswers) * 100)

      // Update the question statistics document
      await updateDoc(questionDocRef, updates)
      
      // Record the individual answer
      await addDoc(collection(db, `quizStatistics/${quizId}/answers`), {
        questionIndex,
        playerId,
        answerIndex,
        isCorrect,
        responseTimeMs,
        timestamp: serverTimestamp()
      })

      // Update quiz statistics
      await updateDoc(doc(db, 'quizStatistics', quizId), {
        totalAnswersSubmitted: increment(1),
        updatedAt: serverTimestamp()
      })

      // Add participant if they don't already exist
      await this.ensureParticipantExists(quizId, playerId)

      console.log(`📝 Recorded answer for question ${questionIndex} by player ${playerId}`)
      return true
    } catch (error) {
      console.error('Error recording answer:', error)
      return false
    }
  }

  // Register a new participant for the quiz
  async ensureParticipantExists(quizId, playerId) {
    try {
      const playerRef = doc(db, `quizStatistics/${quizId}/participants`, playerId)
      const playerDoc = await getDoc(playerRef)

      if (!playerDoc.exists()) {
        // Get player name from the players collection
        const quizPlayerRef = doc(db, `quizzes/${quizId}/players/${playerId}`)
        const quizPlayerDoc = await getDoc(quizPlayerRef)
        
        const playerData = quizPlayerDoc.exists() ? quizPlayerDoc.data() : {}
        
        // Add participant to statistics
        await setDoc(playerRef, {
          joinedAt: serverTimestamp(),
          name: playerData.name || 'Anonymous',
          answeredQuestions: [],
          lastActive: serverTimestamp()
        })

        // Increment participant count in main document
        await updateDoc(doc(db, 'quizStatistics', quizId), {
          participantsCount: increment(1)
        })

        console.log(`👤 Added player ${playerId} to quiz statistics`)
      } else {
        // Update last active timestamp
        await updateDoc(doc(db, `quizStatistics/${quizId}/participants`, playerId), {
          lastActive: serverTimestamp()
        })
      }
      
      return true
    } catch (error) {
      console.error('Error ensuring participant exists:', error)
      return false
    }
  }

  // Update participant's answered questions list
  async updateParticipantAnsweredQuestions(quizId, playerId, questionIndex) {
    try {
      await updateDoc(doc(db, `quizStatistics/${quizId}/participants`, playerId), {
        answeredQuestions: arrayUnion(questionIndex),
        lastActive: serverTimestamp()
      })
      
      return true
    } catch (error) {
      console.error('Error updating participant answered questions:', error)
      return false
    }
  }
}

// Export a singleton instance
export const quizStatisticsService = new QuizStatisticsService()

export default quizStatisticsService