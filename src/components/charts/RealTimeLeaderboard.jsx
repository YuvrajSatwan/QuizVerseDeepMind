import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  Crown, 
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const RealTimeLeaderboard = ({ 
  leaderboard = [], 
  currentPlayerId = null, 
  maxDisplay = 10,
  isCollapsible = false,
  title = "Live Leaderboard"
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [previousLeaderboard, setPreviousLeaderboard] = useState([])
  const [animatedLeaderboard, setAnimatedLeaderboard] = useState([])

  // Track position changes for animations
  useEffect(() => {
    if (leaderboard.length > 0) {
      const newLeaderboard = leaderboard.slice(0, maxDisplay).map((player, index) => {
        const previousPosition = previousLeaderboard.findIndex(p => p.id === player.id)
        const positionChange = previousPosition !== -1 ? previousPosition - index : 0
        
        return {
          ...player,
          position: index + 1,
          positionChange,
          isCurrentUser: player.id === currentPlayerId
        }
      })

      setAnimatedLeaderboard(newLeaderboard)
      setPreviousLeaderboard(leaderboard.slice(0, maxDisplay))
    }
  }, [leaderboard, currentPlayerId, maxDisplay])

  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return (
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">{position}</span>
          </div>
        )
    }
  }

  const getRankColor = (position) => {
    switch (position) {
      case 1:
        return 'from-yellow-400 to-yellow-500'
      case 2:
        return 'from-gray-300 to-gray-400'
      case 3:
        return 'from-amber-500 to-amber-600'
      default:
        return 'from-blue-500 to-purple-600'
    }
  }

  const getPositionChangeIndicator = (change) => {
    if (change > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center text-green-600"
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium ml-1">+{change}</span>
        </motion.div>
      )
    } else if (change < 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center text-red-600"
        >
          <TrendingUp className="w-4 h-4 rotate-180" />
          <span className="text-xs font-medium ml-1">{change}</span>
        </motion.div>
      )
    }
    return null
  }

  const displayedLeaderboard = isExpanded ? animatedLeaderboard : animatedLeaderboard.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="chart-card p-6"
      role="region"
      aria-label="Real-time participant leaderboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              <Users className="w-4 h-4 inline mr-1" />
              {leaderboard.length} participants
            </p>
          </div>
        </div>

        {/* Collapse Toggle */}
        {isCollapsible && animatedLeaderboard.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3">
        <AnimatePresence>
          {displayedLeaderboard.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.05,
                layout: { duration: 0.3 }
              }}
              whileHover={{ scale: 1.02 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                player.isCurrentUser
                  ? 'border-primary-300 bg-gradient-to-r from-primary-50 to-secondary-50 shadow-lg'
                  : player.position <= 3
                  ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Position Change Indicator */}
              {player.positionChange !== 0 && (
                <div className="absolute -top-2 -right-2">
                  {getPositionChangeIndicator(player.positionChange)}
                </div>
              )}

              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div className="flex-shrink-0">
                  {getRankIcon(player.position)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-bold truncate ${
                      player.isCurrentUser ? 'text-primary-700' : 'text-gray-900'
                    }`}>
                      {player.name}
                    </h4>
                    {player.isCurrentUser && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-primary-500" />
                        <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <span>Rank #{player.position}</span>
                    {player.correctAnswers !== undefined && (
                      <span>
                        {player.correctAnswers} correct
                      </span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <motion.div
                    key={player.score}
                    initial={{ scale: 1.2, color: '#10b981' }}
                    animate={{ scale: 1, color: '#374151' }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold text-gray-900"
                  >
                    {player.score}
                  </motion.div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>

              {/* Progress Bar for Top 3 */}
              {player.position <= 3 && leaderboard[0]?.score > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(player.score / leaderboard[0].score) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-full rounded-full bg-gradient-to-r ${getRankColor(player.position)}`}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Current User Position if not in top list */}
      {currentPlayerId && !animatedLeaderboard.some(p => p.id === currentPlayerId) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pt-4 border-t border-gray-200"
        >
          <div className="text-center text-sm text-gray-500 mb-3">Your Position</div>
          {(() => {
            const currentUser = leaderboard.find(p => p.id === currentPlayerId)
            const currentUserPosition = leaderboard.findIndex(p => p.id === currentPlayerId) + 1
            
            if (currentUser) {
              return (
                <div className="p-3 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">#{currentUserPosition}</span>
                      </div>
                      <div>
                        <div className="font-bold text-primary-700">{currentUser.name} (You)</div>
                        <div className="text-xs text-gray-500">{currentUser.correctAnswers || 0} correct answers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary-600">{currentUser.score}</div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}
        </motion.div>
      )}

      {/* Empty State */}
      {animatedLeaderboard.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-gray-400"
        >
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No participants yet</p>
          <p className="text-sm">Scores will appear as players join and answer questions</p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default RealTimeLeaderboard