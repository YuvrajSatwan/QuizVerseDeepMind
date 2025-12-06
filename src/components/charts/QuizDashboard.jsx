import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react'
import OptionDistributionChart from './OptionDistributionChart'
import AccuracyChart from './AccuracyChart'
import RealTimeLeaderboard from './RealTimeLeaderboard'

const QuizDashboard = ({ 
  quiz,
  currentQuestion,
  currentQuestionIndex,
  showResults,
  answerStats,
  leaderboard,
  currentPlayerId,
  isHost = false,
  mediumWidth = false, // New prop for medium-width layout when in 3-column mode
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const [chartType, setChartType] = useState('bar')
  const [showSettings, setShowSettings] = useState(false)

  if (!quiz) return null
  
  // Show dashboard to host, or to players when results are shown
  const shouldShowDashboard = isHost || showResults

  const toggleVisibility = () => setIsVisible(!isVisible)
  const toggleExpanded = () => setIsExpanded(!isExpanded)

  // Mobile responsive layout settings
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={`w-full ${className}`}>
      {/* Dashboard Header - Hidden for participants when no results shown or in mediumWidth mode */}
      {!mediumWidth && shouldShowDashboard && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-t-xl"
        >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
<h3 className="font-bold text-gray-900">Quiz Analytics</h3>
            <p className="text-xs text-gray-500">
Real-time insights and statistics
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              showSettings 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Dashboard Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
            title={isExpanded ? 'Collapse Dashboard' : 'Expand Dashboard'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Hide/Show */}
          <button
            onClick={toggleVisibility}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
            title={isVisible ? 'Hide Dashboard' : 'Show Dashboard'}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        </motion.div>
      )}

      {/* Settings Panel - Hidden for participants when no results shown or in mediumWidth mode */}
      <AnimatePresence>
        {!mediumWidth && shouldShowDashboard && showSettings && isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-gray-50 border-x border-gray-200"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Chart Type:</span>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="doughnut">Doughnut Chart</option>
                </select>
              </div>
              
              <div className="text-xs text-gray-500">
                💡 Use charts to visualize participant responses in real-time
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Content */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`${mediumWidth || !shouldShowDashboard ? 'rounded-xl' : 'rounded-b-xl'} bg-white overflow-hidden`}
          >
            <div className={`p-4 ${isExpanded ? '' : 'pb-2'}`}>
              {!shouldShowDashboard ? (
                // Stats disabled message for players
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <EyeOff className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Stats Hidden</h3>
                  <p className="text-gray-500 text-sm">
                    The host has disabled real-time statistics for players.
                  </p>
                </div>
              ) : (
                isExpanded ? (
                  mediumWidth ? (
                    // Medium-width Dashboard View for 3-column layout - Better space utilization
                    <div className="space-y-6">
                      {shouldShowDashboard && (
                        <div className="text-center">
                          <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
                            Quiz Analytics
                          </h4>
                          {/* Participant Rank Chip (per-question), shown during results */}
                          {showResults && !isHost && currentPlayerId && (leaderboard || []).length > 0 && (() => {
                            const idx = (leaderboard || []).findIndex(p => p.id === currentPlayerId)
                            return idx >= 0 ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 text-sm text-primary-700 shadow-sm mb-4">
                                <span className="font-semibold">Your Rank:</span>
                                <span className="font-mono tracking-widest text-gray-900">{idx + 1}</span>
                                <span className="text-gray-500">of</span>
                                <span className="font-mono text-gray-900">{(leaderboard || []).length}</span>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                      
                      {/* Essential metrics in improved grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {leaderboard.length}
                          </div>
                          <div className="text-sm font-medium text-blue-700">Active Players</div>
                        </div>
                        
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            {currentQuestionIndex + 1}/{quiz.questions.length}
                          </div>
                          <div className="text-sm font-medium text-green-700">Progress</div>
                        </div>
                      </div>
                      

                      {/* Accuracy Summary - Show when results shown */}
                      {showResults && (
                        <AccuracyChart
                          question={currentQuestion}
                          answerStats={answerStats}
                          showResults={showResults}
                          mediumWidth={true}
                        />
                      )}
                    </div>
                  ) : (
                    // Full Dashboard View - Simplified Layout
                    <div className="space-y-4">
                      {/* Participant Rank Chip (per-question), shown during results */}
                      {showResults && !isHost && currentPlayerId && (leaderboard || []).length > 0 && (() => {
                        const idx = (leaderboard || []).findIndex(p => p.id === currentPlayerId)
                        return idx >= 0 ? (
                          <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 text-sm text-primary-700 shadow-sm">
                              <span className="font-semibold">Your Rank:</span>
                              <span className="font-mono tracking-widest text-gray-900">{idx + 1}</span>
                              <span className="text-gray-500">of</span>
                              <span className="font-mono text-gray-900">{(leaderboard || []).length}</span>
                            </div>
                          </div>
                        ) : null
                      })()}
                      {/* Leaderboard - Show when results shown */}
                      {leaderboard.length > 0 && (isHost || showResults) && (
                        <RealTimeLeaderboard
                          leaderboard={leaderboard}
                          currentPlayerId={currentPlayerId}
                          maxDisplay={5}
                          isCollapsible={false}
                          title="Top Players"
                        />
                      )}
                      
                      {/* Accuracy Summary - Show when results shown */}
                      {showResults && (
                        <AccuracyChart
                          question={currentQuestion}
                          answerStats={answerStats}
                          showResults={showResults}
                        />
                      )}
                    </div>
                  )
                ) : (
                  // Collapsed View - Essential metrics only
                  <div className="grid gap-3 grid-cols-2">
                    <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">
                        {leaderboard.length}
                      </div>
                      <div className="text-xs text-gray-600">Players</div>
                    </div>

                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {currentQuestionIndex + 1}/{quiz.questions.length}
                      </div>
                      <div className="text-xs text-gray-600">Question</div>
                    </div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Dashboard Toggle (when hidden) */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={toggleVisibility}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
            title="Show Dashboard"
          >
            <BarChart3 className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default QuizDashboard