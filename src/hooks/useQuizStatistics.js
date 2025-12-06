import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export const useQuizStatistics = (quizId, currentQuestionIndex = 0) => {
  const [answerStats, setAnswerStats] = useState({})
  const [participants, setParticipants] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [questionStatistics, setQuestionStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Calculate answer statistics for the current question (legacy support)
  const calculateAnswerStats = useCallback((participants, questionIndex) => {
    const stats = {}
    
    // Calculating answer statistics
    
    participants.forEach(participant => {
      // Check if participant has answers for this question
      if (participant.answers && participant.answers[questionIndex] !== undefined) {
        const answerData = participant.answers[questionIndex]
        // Handle both old format (direct value) and new format (object with answer property)
        const answerIndex = typeof answerData === 'object' ? answerData.answer : answerData
        stats[answerIndex] = (stats[answerIndex] || 0) + 1
        // Participant answered
      } else {
        // Participant hasn't answered yet
      }
    })
    
    // Final answer statistics calculated
    return stats
  }, [])

  // Calculate leaderboard with position changes
  const calculateLeaderboard = useCallback((participants) => {
    return participants
      .map(participant => {
        // Calculate total score and correct answers - FIXED: Handle both old and new formats
        const answers = participant.answers || []
        let totalScore = participant.score || 0 // Use stored score first
        let correctAnswers = 0
        
        // Count correct answers from answers array
        if (Array.isArray(answers)) {
          answers.forEach(answerData => {
            if (typeof answerData === 'object' && answerData.isCorrect) {
              correctAnswers++
            }
          })
        } else {
          // Handle object format
          Object.entries(answers).forEach(([questionIndex, answerData]) => {
            if (typeof answerData === 'object' && answerData.isCorrect) {
              correctAnswers++
            }
          })
        }
        
        return {
          id: participant.id,
          name: participant.name || 'Anonymous',
          score: totalScore,
          correctAnswers,
          answers: participant.answers,
          joinedAt: participant.joinedAt,
          lastAnswered: participant.lastAnswered
        }
      })
      .sort((a, b) => {
        // Sort by score first, then by time (earlier joiners win ties)
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return new Date(a.joinedAt) - new Date(b.joinedAt)
      })
  }, [])

  // Real-time listener for participants and their answers
  useEffect(() => {
    if (!quizId) {
      setLoading(false)
      return
    }

    // Setting up quiz statistics listener
    
    const unsubscribes = []

    // Listen for participants in this quiz (legacy structure for leaderboard)
    const participantsQuery = query(
      collection(db, `quizzes/${quizId}/players`)
    )

    const participantsUnsubscribe = onSnapshot(
      participantsQuery,
      (snapshot) => {
        try {
          const participantData = []
          
          snapshot.forEach((doc) => {
            participantData.push({
              id: doc.id,
              ...doc.data()
            })
          })

          // Participants data updated
          
          // Update participants
          setParticipants(participantData)
          
          // Calculate leaderboard
          const currentLeaderboard = calculateLeaderboard(participantData)
          setLeaderboard(currentLeaderboard)
          
          setError(null)
        } catch (err) {
          console.error('Error processing participants:', err)
          setError(err.message)
        }
      },
      (err) => {
        console.error('Participants listener error:', err)
        setError('Failed to load participants data')
      }
    )
    unsubscribes.push(participantsUnsubscribe)

    // Use legacy calculation for answer statistics (enhanced stats temporarily disabled)
    const legacyStats = calculateAnswerStats(participants, currentQuestionIndex)
    setAnswerStats(legacyStats)
    setLoading(false)

    return () => {
      // Cleaning up quiz statistics listeners
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [quizId, currentQuestionIndex, calculateAnswerStats, calculateLeaderboard])

  // Update answer stats when question changes
  useEffect(() => {
    if (participants.length > 0) {
      const newAnswerStats = calculateAnswerStats(participants, currentQuestionIndex)
      setAnswerStats(newAnswerStats)
      // Answer statistics updated for question
    }
  }, [currentQuestionIndex, participants, calculateAnswerStats])

  // Get participant by ID
  const getParticipantById = useCallback((participantId) => {
    return participants.find(p => p.id === participantId)
  }, [participants])

  // Get answer statistics for a specific question
  const getQuestionStats = useCallback((questionIndex) => {
    return calculateAnswerStats(participants, questionIndex)
  }, [participants, calculateAnswerStats])

  // Get participation rate (how many participants have answered current question)
  const getParticipationRate = useCallback(() => {
    if (participants.length === 0) return 0
    
    const answeredCount = participants.filter(p => 
      p.answers && p.answers[currentQuestionIndex] !== undefined
    ).length
    
    return Math.round((answeredCount / participants.length) * 100)
  }, [participants, currentQuestionIndex])

  // Get average score
  const getAverageScore = useCallback(() => {
    if (participants.length === 0) return 0
    
    const totalScore = participants.reduce((sum, p) => {
      const answers = p.answers || {}
      let participantScore = 0
      
      Object.values(answers).forEach(answerData => {
        if (typeof answerData === 'object' && answerData.score) {
          participantScore += answerData.score
        }
      })
      
      return sum + participantScore
    }, 0)
    
    return Math.round(totalScore / participants.length)
  }, [participants])

  // Get top performers (top 3)
  const getTopPerformers = useCallback(() => {
    return leaderboard.slice(0, 3)
  }, [leaderboard])

  return {
    // Data
    answerStats,
    participants,
    leaderboard,
    questionStatistics,
    
    // State
    loading,
    error,
    
    // Utility functions
    getParticipantById,
    getQuestionStats,
    getParticipationRate,
    getAverageScore,
    getTopPerformers,
    
    // Computed values
    totalParticipants: participants.length,
    participationRate: getParticipationRate(),
    averageScore: getAverageScore(),
    topPerformers: getTopPerformers(),
    
    // Enhanced statistics (if available)
    accuracyRate: questionStatistics?.accuracyRate || 0,
    totalAnswers: questionStatistics?.totalAnswers || 0,
    correctCount: questionStatistics?.correctCount || 0,
    incorrectCount: questionStatistics?.incorrectCount || 0,
    responseTime: questionStatistics?.responseTime || null
  }
}