import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Target, Users } from 'lucide-react'

const AccuracyChart = ({ question, answerStats, showResults = false, compact = false, mediumWidth = false }) => {
  const [animatedStats, setAnimatedStats] = useState({ correct: 0, incorrect: 0, percentage: 0 })

  useEffect(() => {
    if (answerStats && question && showResults) {
      // Handle different question types
      let correctCount = 0
      const totalResponses = Object.values(answerStats).reduce((sum, count) => sum + count, 0)
      
      // For different question types, find correct answers
      if (question.type === 'word') {
        // For word questions, check case-insensitive match
        const correctAnswer = question.correctAnswer?.toLowerCase()
        Object.entries(answerStats).forEach(([answer, count]) => {
          if (answer.toLowerCase() === correctAnswer) {
            correctCount += count
          }
        })
      } else if (question.type === 'truefalse') {
        // For true/false questions, correctAnswer is 0 (True) or 1 (False)
        correctCount = answerStats[question.correctAnswer] || 0
      } else {
        // For MCQ questions, correctAnswer is the option index
        correctCount = answerStats[question.correctAnswer] || 0
      }
      
      const incorrectCount = totalResponses - correctCount
      const accuracyPercentage = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
      
      // Stats calculated successfully

      // Animate the statistics
      const timer = setTimeout(() => {
        setAnimatedStats({
          correct: correctCount,
          incorrect: incorrectCount,
          percentage: accuracyPercentage,
          total: totalResponses
        })
      }, 200)

      return () => clearTimeout(timer)
    } else {
      setAnimatedStats({ correct: 0, incorrect: 0, percentage: 0, total: 0 })
    }
  }, [answerStats, question, showResults])

  if (!question || !showResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Accuracy Feedback</h3>
            <p className="text-sm text-gray-500">Waiting for results...</p>
          </div>
        </div>
        
        <div className="text-center py-12 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Results will appear after the question ends</p>
        </div>
      </motion.div>
    )
  }

  const { correct, incorrect, percentage, total } = animatedStats

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`chart-card ${compact ? 'p-3' : mediumWidth ? 'p-4' : 'p-6'}`}
      role="region"
      aria-label="Question accuracy feedback"
    >
      {/* Header */}
      <div className={`flex items-center space-x-2 ${compact ? 'mb-3' : mediumWidth ? 'mb-4' : 'mb-6'}`}>
        <div className={`${compact ? 'w-8 h-8' : mediumWidth ? 'w-9 h-9' : 'w-10 h-10'} bg-blue-100 rounded-xl flex items-center justify-center`}>
          <Target className={`${compact ? 'w-4 h-4' : mediumWidth ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600`} />
        </div>
        <div>
          <h3 className={`${compact ? 'text-sm' : mediumWidth ? 'text-base' : 'text-lg'} font-bold text-gray-900`}>Accuracy</h3>
          <p className={`${compact || mediumWidth ? 'text-xs' : 'text-sm'} text-gray-500`}>
            <Users className={`${compact || mediumWidth ? 'w-3 h-3' : 'w-4 h-4'} inline mr-1`} />
            {total} responses
          </p>
        </div>
      </div>

      {/* Main Accuracy Display - removed loader and percent as requested */}
      <div className={`${compact ? 'mb-2' : mediumWidth ? 'mb-3' : 'mb-4'}`} />

      {/* Accuracy progress bar (restored) */}
      {!compact && !mediumWidth && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Accuracy Rate</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                percentage >= 70 
                  ? 'bg-gradient-to-r from-green-400 to-green-500' 
                  : percentage >= 50
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Correct vs Incorrect Breakdown - Simplified for compact and mediumWidth */}
      {compact ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-bold text-green-900">{correct}</div>
            <div className="text-xs text-green-600">✓</div>
          </div>
          <div className="text-center p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-bold text-red-900">{incorrect}</div>
            <div className="text-xs text-red-600">✗</div>
          </div>
        </div>
      ) : mediumWidth ? (
        <>
          {/* Accuracy progress bar for medium width (restored) */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Accuracy Rate</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  percentage >= 70 
                    ? 'bg-gradient-to-r from-green-400 to-green-500' 
                    : percentage >= 50
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center p-4 bg-green-50 border-2 border-green-200 rounded-xl"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Correct</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{correct}</div>
              <div className="text-xs text-green-600">participants</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center p-4 bg-red-50 border-2 border-red-200 rounded-xl"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Incorrect</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{incorrect}</div>
              <div className="text-xs text-red-600">participants</div>
            </motion.div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Correct</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-2xl font-bold text-green-900"
                >
                  {correct}
                </motion.span>
                <span className="text-sm text-green-600">participants</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Incorrect</span>
              </div>
              <div className="flex items-baseline space-x-1">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-2xl font-bold text-red-900"
                >
                  {incorrect}
                </motion.span>
                <span className="text-sm text-red-600">participants</span>
              </div>
            </motion.div>
          </div>

          {/* Correct Answer Display */}
          {question.options && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {String.fromCharCode(65 + question.correctAnswer)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 mb-1">Correct Answer:</p>
                  <p className="text-gray-900">{question.options[question.correctAnswer]}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              </div>
            </motion.div>
          )}

          {/* Performance Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center mt-6"
          >
            {percentage >= 80 && (
              <p className="text-green-600 font-medium">
                🎯 Excellent! Most participants understood this concept well.
              </p>
            )}
            {percentage >= 60 && percentage < 80 && (
              <p className="text-yellow-600 font-medium">
                👍 Good performance! Some areas for review.
              </p>
            )}
            {percentage >= 40 && percentage < 60 && (
              <p className="text-orange-600 font-medium">
                🤔 Mixed results. This topic might need more explanation.
              </p>
            )}
            {percentage < 40 && (
              <p className="text-red-600 font-medium">
                📚 Challenging question! Consider reviewing this concept.
              </p>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

export default AccuracyChart