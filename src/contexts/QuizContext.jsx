import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '../firebase/config'

const QuizContext = createContext()

export function useQuiz() {
  return useContext(QuizContext)
}

export function QuizProvider({ children }) {
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizState, setQuizState] = useState('waiting') // waiting, active, finished
  const [players, setPlayers] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)

  // Function to calculate and update leaderboard
  const calculateLeaderboard = async (quizId) => {
    try {
      const playersSnapshot = await getDocs(collection(db, `quizzes/${quizId}/players`))
      const playersData = []
      
      playersSnapshot.forEach((doc) => {
        const data = doc.data()
        
        // Calculate correct answers count
        const answers = data.answers || []
        let correctAnswers = 0
        
        if (Array.isArray(answers)) {
          answers.forEach(answerData => {
            if (typeof answerData === 'object' && answerData.isCorrect) {
              correctAnswers++
            }
          })
        }
        
        // Calculate average submission time for tiebreaking (faster = better)
        let totalSubmissionTime = 0
        let submissionCount = 0
        
        if (Array.isArray(answers)) {
          answers.forEach(answerData => {
            if (typeof answerData === 'object' && answerData.submissionTime) {
              totalSubmissionTime += answerData.submissionTime
              submissionCount++
            }
          })
        }
        
        const avgSubmissionTime = submissionCount > 0 ? totalSubmissionTime / submissionCount : Date.now()
        
        playersData.push({
          id: doc.id,
          name: data.name,
          score: data.score || 0,
          correctAnswers,
          answers: data.answers || [],
          joinedAt: data.joinedAt,
          lastAnsweredAt: data.lastAnsweredAt,
          avgSubmissionTime: avgSubmissionTime
        })
      })
      
      // Sort by score (highest first), then by average submission time (fastest first) for tiebreaking
      const sortedPlayers = playersData.sort((a, b) => {
        // Primary sort: higher score wins
        if (b.score !== a.score) {
          return b.score - a.score
        }
        
        // Secondary sort: faster average submission time wins (lower timestamp = earlier = better)
        return a.avgSubmissionTime - b.avgSubmissionTime
      })
      setLeaderboard(sortedPlayers)
      setPlayers(playersData)
      
      return sortedPlayers
    } catch (error) {
      console.error('Error calculating leaderboard:', error)
      return []
    }
  }

  const createQuiz = async (quizData) => {
    try {
      console.log('Creating quiz with data:', quizData)
      console.log('Firestore db instance:', db)
      
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        ...quizData,
        createdAt: serverTimestamp(),
        status: 'waiting',
        currentQuestion: 0,
        players: [],
        leaderboard: []
      })
      
      console.log('Quiz created successfully with ID:', quizRef.id)
      return quizRef.id
    } catch (error) {
      console.error('Error creating quiz:', error)
      console.error('Error details:', error.message, error.code)
      throw error
    }
  }

  const checkQuizExists = async (quizId) => {
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', quizId))
      return quizDoc.exists()
    } catch (error) {
      console.error('Error checking quiz existence:', error)
      return false
    }
  }

  const joinQuiz = async (quizId, playerName) => {
    try {
      // First check if the quiz exists
      const quizExists = await checkQuizExists(quizId)
      if (!quizExists) {
        throw new Error('Quiz not found')
      }

      const playerRef = await addDoc(collection(db, `quizzes/${quizId}/players`), {
        name: playerName,
        score: 0,
        joinedAt: serverTimestamp(),
        answers: []
      })
      
      return playerRef.id
    } catch (error) {
      console.error('Error joining quiz:', error)
      throw error
    }
  }

  const startQuiz = async (quizId) => {
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        status: 'active',
        startedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error starting quiz:', error)
      throw error
    }
  }

  const submitAnswer = async (quizId, playerId, questionIndex, answer, isCorrect = false, timeBonus = 0, submissionTime = Date.now(), responseTimeMs = null) => {
    try {
      // Calculate score for this answer - FIXED: Ensure 0 points for wrong answers
      const baseScore = isCorrect ? 100 : 0
      const totalScore = isCorrect ? baseScore + timeBonus : 0 // Wrong answers always get 0
      
      console.log(`🎯 Score calculation: isCorrect=${isCorrect}, baseScore=${baseScore}, timeBonus=${timeBonus}, totalScore=${totalScore}`)
      
      // Get current player data first
      const playerDoc = await getDoc(doc(db, `quizzes/${quizId}/players/${playerId}`))
      if (!playerDoc.exists()) {
        throw new Error('Player not found')
      }
      
      const playerData = playerDoc.data()
      const currentAnswers = playerData.answers || []
      const currentScore = playerData.score || 0
      
      // Update answers array
      const updatedAnswers = [...currentAnswers]
      updatedAnswers[questionIndex] = {
        answer,
        isCorrect,
        score: totalScore,
        answeredAt: new Date().toISOString(),
        submissionTime: submissionTime, // Store millisecond timestamp for precise sorting
        // Approximate response time (client-estimated). Used for cheat detection signals.
        ...(typeof responseTimeMs === 'number' && responseTimeMs >= 0 ? { responseTimeMs } : {})
      }
      
      // Calculate new total score
      const newTotalScore = currentScore + totalScore
      
      // Update player document with both answers and new total score
      await updateDoc(doc(db, `quizzes/${quizId}/players/${playerId}`), {
        answers: updatedAnswers,
        score: newTotalScore,
        lastAnsweredAt: serverTimestamp()
      })
      
      console.log(`✅ Answer submitted: Player score updated from ${currentScore} to ${newTotalScore}`)
    } catch (error) {
      console.error('Error submitting answer:', error)
      throw error
    }
  }

  const nextQuestion = async (quizId) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId)
      const quizDoc = await getDoc(quizRef)
      const currentQuestionIndex = quizDoc.data().currentQuestion || 0
      
      await updateDoc(quizRef, {
        currentQuestion: currentQuestionIndex + 1
      })
    } catch (error) {
      console.error('Error moving to next question:', error)
      throw error
    }
  }

  const endQuiz = async (quizId) => {
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        status: 'finished',
        endedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error ending quiz:', error)
      throw error
    }
  }

  const value = {
    currentQuiz,
    currentQuestion,
    quizState,
    players,
    leaderboard,
    timeLeft,
    createQuiz,
    joinQuiz,
    checkQuizExists,
    startQuiz,
    submitAnswer,
    nextQuestion,
    endQuiz,
    calculateLeaderboard,
    setCurrentQuiz,
    setCurrentQuestion,
    setQuizState,
    setPlayers,
    setLeaderboard,
    setTimeLeft
  }

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  )
}

