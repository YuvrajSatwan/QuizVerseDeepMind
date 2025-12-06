import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users, Target, CheckCircle, BarChart3, Star } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

const QuizSummary = ({ quiz, leaderboard, isVisible = false, quizId }) => {
  if (!quiz || !isVisible) return null

  // Ratings state
  const [ratings, setRatings] = useState([])

  useEffect(() => {
    if (!quizId || !isVisible) return
    const unsub = onSnapshot(collection(db, `quizzes/${quizId}/ratings`), (snapshot) => {
      const items = []
      snapshot.forEach((doc) => {
        const data = doc.data() || {}
        items.push({ id: doc.id, rating: data.rating, feedback: data.feedback || '' })
      })
      setRatings(items)
    })
    return () => unsub()
  }, [quizId, isVisible])

  const averageRating = useMemo(() => {
    if (!ratings.length) return 0
    const sum = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
    return Math.round((sum / ratings.length) * 10) / 10 // one decimal
  }, [ratings])

  const feedbacks = useMemo(() => ratings.map(r => (r.feedback || '').trim()).filter(Boolean), [ratings])

  // Calculate overall quiz statistics
  const totalQuestions = quiz.questions?.length || 0
  const totalParticipants = leaderboard.length
  
  // Calculate overall accuracy across all questions
  let totalCorrectAnswers = 0
  let totalAnswersGiven = 0
  let totalPossiblePoints = 0
  let totalEarnedPoints = 0

  leaderboard.forEach(player => {
    if (player.answers && Array.isArray(player.answers)) {
      player.answers.forEach(answer => {
        if (typeof answer === 'object') {
          totalAnswersGiven++
          if (answer.isCorrect) {
            totalCorrectAnswers++
          }
          totalEarnedPoints += answer.score || 0
        }
      })
    }
    totalPossiblePoints += totalQuestions * 100 // Assuming 100 points per question
  })

  const overallAccuracy = totalAnswersGiven > 0 ? Math.round((totalCorrectAnswers / totalAnswersGiven) * 100) : 0
  const averageScore = totalParticipants > 0 ? Math.round(totalEarnedPoints / totalParticipants) : 0

  // Question-by-question breakdown
  const questionBreakdown = quiz.questions?.map((question, index) => {
    let correctCount = 0
    let totalResponses = 0

    leaderboard.forEach(player => {
      if (player.answers && Array.isArray(player.answers) && player.answers[index]) {
        totalResponses++
        const answer = player.answers[index]
        if (typeof answer === 'object' && answer.isCorrect) {
          correctCount++
        }
      }
    })

    const questionAccuracy = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0

    return {
      questionNumber: index + 1,
      text: question.text,
      type: question.type,
      correctCount,
      totalResponses,
      accuracy: questionAccuracy,
      difficulty: questionAccuracy >= 70 ? 'Easy' : questionAccuracy >= 50 ? 'Medium' : 'Hard'
    }
  }) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 mb-6"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Quiz Summary</h3>
              <p className="text-sm sm:text-base text-gray-600">Complete results for "{quiz.title}"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Statistics (includes rating) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4 text-center"
        >
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-xl sm:text-2xl font-bold text-blue-900">{totalParticipants}</div>
          <div className="text-xs sm:text-sm text-blue-700">Participants</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-green-50 border-2 border-green-200 rounded-xl p-3 sm:p-4 text-center"
        >
          <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">{overallAccuracy}%</div>
          <div className="text-sm text-green-700">Overall Accuracy</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 sm:p-4 text-center"
        >
          <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-900">{averageScore}</div>
          <div className="text-sm text-purple-700">Average Score</div>
        </motion.div>


        {/* Show Average Rating card when enabled */}
        {quiz.enableRating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center"
          >
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-900">{averageRating.toFixed(1)}</div>
            <div className="text-sm text-yellow-700">Average Rating</div>
          </motion.div>
        )}
        {!quiz.enableRating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center"
          >
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-900">—</div>
            <div className="text-sm text-yellow-700">No ratings option given</div>
          </motion.div>
        )}
      </div>

      {/* Anonymous Feedback Section */}
      {quiz.enableRating && (
        <div className="mb-8">
          <h4 className="text-lg font-bold text-gray-900 mb-4">💬 Anonymous Feedback</h4>
          {feedbacks.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1">
              {feedbacks.map((fb, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                  <p className="text-gray-800">{fb}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No feedback yet.</div>
          )}
        </div>
      )}

      {/* Question-by-Question Breakdown */}
      <div className="mb-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">📊 Question Analysis</h4>
        <div className="space-y-3">
          {questionBreakdown.map((q, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-gray-50 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">
                    Question {q.questionNumber}: {q.text}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    Type: {q.type} • Difficulty: {q.difficulty}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-lg font-bold ${
                    q.accuracy >= 70 ? 'text-green-600' :
                    q.accuracy >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {q.accuracy}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {q.correctCount}/{q.totalResponses}
                  </div>
                </div>
              </div>
              
              {/* Visual accuracy bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${q.accuracy}%` }}
                  transition={{ delay: 0.2 * index, duration: 1 }}
                  className={`h-2 rounded-full ${
                    q.accuracy >= 70 ? 'bg-green-500' :
                    q.accuracy >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default QuizSummary
