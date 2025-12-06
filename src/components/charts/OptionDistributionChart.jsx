import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, PieChart, Layers, Users, CheckCircle } from 'lucide-react'

// Mentimeter-style option bar component
const MentimeterOptionBar = ({ option, index, count, totalResponses, isCorrect, showCorrect, delay = 0 }) => {
  const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600', 
    'from-pink-500 to-pink-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600',
  ]
  
  const correctColor = 'from-emerald-500 to-emerald-600'
  const barColor = showCorrect && isCorrect ? correctColor : colors[index % colors.length]
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative bg-gray-100 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
        showCorrect && isCorrect 
          ? 'border-emerald-300 shadow-lg shadow-emerald-200/50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Background fill bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ delay: delay + 0.2, duration: 1.2, ease: "easeOut" }}
        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} opacity-90`}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between p-4 min-h-[60px]">
        <div className="flex items-center space-x-3 flex-1">
          {/* Option letter */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            percentage > 50 ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
          }`}>
            {String.fromCharCode(65 + index)}
          </div>
          
          {/* Option text */}
          <span className={`font-medium text-sm md:text-base flex-1 ${
            percentage > 50 ? 'text-white' : 'text-gray-800'
          }`}>
            {option}
          </span>
        </div>
        
        {/* Percentage and correct indicator */}
        <div className="flex items-center space-x-2">
          {showCorrect && isCorrect && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.4, type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </motion.div>
          )}
          
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.6, duration: 0.3 }}
            className={`font-bold text-lg ${
              percentage > 50 ? 'text-white' : 'text-gray-800'
            }`}
          >
            {percentage}%
          </motion.span>
          
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.8, duration: 0.3 }}
            className={`text-xs ${
              percentage > 50 ? 'text-white/80' : 'text-gray-600'
            }`}
          >
            ({count})
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}

const OptionDistributionChart = ({ 
  question, 
  answerStats, 
  showCorrectAnswer = false, 
  chartType = 'mentimeter',
  onChartTypeChange 
}) => {
  const [animatedData, setAnimatedData] = useState([])
  const [showChart, setShowChart] = useState(false)

  // Animate data changes and show chart with delay
  useEffect(() => {
    if (answerStats && question) {
      const totalResponses = Object.values(answerStats).reduce((a, b) => a + b, 0)
      const newData = question.options.map((option, index) => ({
        option,
        count: answerStats[index] || 0,
        percentage: totalResponses > 0 ? 
          Math.round(((answerStats[index] || 0) / totalResponses) * 100) : 0,
        isCorrect: index === question.correctAnswer
      }))
      
      setAnimatedData(newData)
      
      // Show chart with slight delay for better UX
      const timer = setTimeout(() => {
        setShowChart(true)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [answerStats, question])

  const totalResponses = Object.values(answerStats || {}).reduce((sum, count) => sum + count, 0)
  
  if (!question || !showChart) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="chart-card p-6"
        role="region"
        aria-label="Answer distribution chart"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Answer Distribution</h3>
            <p className="text-sm text-gray-500">
              {totalResponses > 0 ? (
                <>
                  <Users className="w-4 h-4 inline mr-1" />
                  {totalResponses} responses
                </>
              ) : (
                'Waiting for responses...'
              )}
            </p>
          </div>
        </div>
        
        {totalResponses === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No responses yet</p>
            <p className="text-sm">Charts will appear as participants answer</p>
          </div>
        )}
      </motion.div>
    )
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="chart-card p-6"
      role="region"
      aria-label="Answer distribution chart"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Live Results</h3>
          <p className="text-sm text-gray-500">
            <Users className="w-4 h-4 inline mr-1" />
            {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
          </p>
        </div>
      </div>

      {/* Mentimeter-style Option Bars */}
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <MentimeterOptionBar
            key={index}
            option={option}
            index={index}
            count={animatedData[index]?.count || 0}
            totalResponses={totalResponses}
            isCorrect={index === question.correctAnswer}
            showCorrect={showCorrectAnswer}
            delay={index * 0.1}
          />
        ))}
      </div>
      
      {/* Summary Stats */}
      {totalResponses > 0 && showCorrectAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Correct Answer:</span>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                {String.fromCharCode(65 + question.correctAnswer)}
              </div>
              <span className="font-medium text-gray-900">
                {Math.round(((answerStats[question.correctAnswer] || 0) / totalResponses) * 100)}% got it right
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default OptionDistributionChart