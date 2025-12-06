import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  Users, 
  Trophy, 
  ArrowLeft,
  CheckCircle,
  Play,
  Eye,
  BarChart3,
  Settings,
  MoreVertical,
  Pause,
  RotateCcw,
  Star
} from 'lucide-react'
import { useQuiz } from '../contexts/QuizContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useQuizStatistics } from '../hooks/useQuizStatistics'
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import QuizDashboard from '../components/charts/QuizDashboard'
import QuizSummary from '../components/charts/QuizSummary'

const QuizRoom = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { calculateLeaderboard, submitAnswer: submitAnswerToContext, players: contextPlayers, leaderboard: contextLeaderboard } = useQuiz()
  const { success, error, info } = useToast()
  
  // Core State
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  
  // Quiz Flow State
  const [quizState, setQuizState] = useState('waiting') // waiting, active, finished
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  
  // Player State
  const [players, setPlayers] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [playerAnswers, setPlayerAnswers] = useState({})
  
  // Dashboard State
  const [showDashboard, setShowDashboard] = useState(true)
  
  // Rating State (for players)
  const [ratingValue, setRatingValue] = useState(null) // 1-5
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  
  // Derived quiz flow helpers
  const totalSteps = (quiz?.questions?.length || 0) + (quiz?.enableRating ? 1 : 0)
  const isRatingStep = !!quiz?.enableRating && (currentQuestionIndex === (quiz?.questions?.length || 0))
  
  // User Interaction State
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timer, setTimer] = useState(30)
  const [playerId, setPlayerId] = useState('')
  const [showHostMenu, setShowHostMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playersCountUpdated, setPlayersCountUpdated] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(true)
  // Removed showStatsToPlayers - stats now show automatically when results are revealed
  
  // Real-time quiz statistics (after currentQuestionIndex is declared)
  const {
    answerStats: statsAnswerStats,
    leaderboard: statsLeaderboard,
    loading: statsLoading,
    error: statsError,
    participationRate,
    accuracyRate,
    totalAnswers
  } = useQuizStatistics(quizId, currentQuestionIndex)

  // Initialize Quiz Room
  useEffect(() => {
    const initializeQuizRoom = async () => {
      try {
        // Initializing Quiz Room
        
        // Load quiz data
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId))
        if (!quizDoc.exists()) {
          error('Quiz not found')
          navigate('/')
          return
        }

        const quizData = quizDoc.data()
        setQuiz(quizData)
        
        // Determine user role
        const storedHostQuizId = localStorage.getItem('isQuizHost')
        const storedPlayerId = localStorage.getItem('playerId')
        
        const userIsHost = storedHostQuizId === quizId
        setIsHost(userIsHost)
        setPlayerId(storedPlayerId || '')
        
        // Initialize rating submission state from localStorage (anonymous)
        setRatingSubmitted(localStorage.getItem(`quizRated:${quizId}`) === 'true')
        
        // User role determined
        
        // Set initial quiz state
        setQuizState(quizData.status || 'waiting')
        setCurrentQuestionIndex(quizData.currentQuestion || 0)
        setShowResults(quizData.showResults || false)
        setShowLeaderboard(quizData.showLeaderboard || false)
        
        // Load player data
        await loadPlayers()
        
        setLoading(false)
      } catch (err) {
        console.error('❌ Failed to initialize quiz room:', err)
        error('Failed to load quiz')
        navigate('/')
      }
    }

    initializeQuizRoom()
  }, [quizId])

  // Real-time Quiz Updates
  useEffect(() => {
    if (!quiz) return

    // Setting up real-time listeners
    
    const unsubscribeQuiz = onSnapshot(
      doc(db, 'quizzes', quizId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          
          // Update quiz state
          const newState = data.status || 'waiting'
          const newQuestionIndex = data.currentQuestion || 0
          const newShowResults = data.showResults || false
          const newShowLeaderboard = data.showLeaderboard || false
          
          // Reset answer state when question changes
          if (newQuestionIndex !== currentQuestionIndex) {
            // Initialize selectedAnswer based on question type
            const newQuestion = quiz.questions?.[newQuestionIndex]
            if (newQuestion?.type === 'word') {
              setSelectedAnswer('')
            } else {
              setSelectedAnswer(null)
            }
            setHasAnswered(false)
            setIsSubmitting(false)
            const timerValue = data?.questionTime || 30
            console.log('Debug - Setting timer in QuizRoom:', {
              dataQuestionTime: data?.questionTime,
              finalTimerValue: timerValue
            })
            setTimer(timerValue)
            // Refresh leaderboard when question changes to ensure consistency
            setTimeout(() => loadPlayers(), 1000)
          }
          
          // Reset timer when quiz becomes active or results are hidden
          if ((newState === 'active' && quizState !== 'active') || 
              (showResults && !newShowResults)) {
            const timerValue = data?.questionTime || 30
            console.log('Debug - Resetting timer in QuizRoom:', {
              dataQuestionTime: data?.questionTime,
              finalTimerValue: timerValue
            })
            setTimer(timerValue)
          }
          
          // Refresh leaderboard when results are shown to ensure consistency
          if (newShowResults && !showResults) {
            setTimeout(() => loadPlayers(), 500)
          }
          
          setQuizState(newState)
          setCurrentQuestionIndex(newQuestionIndex)
          setShowResults(newShowResults)
          setShowLeaderboard(newShowLeaderboard)
          
          // Quiz state updated
        }
      },
      (err) => console.warn('🌐 Quiz sync error:', err.message)
    )

    return () => unsubscribeQuiz()
  }, [quiz, quizId, currentQuestionIndex, quizState, showResults])
  
  // Real-time Players/Leaderboard Updates
  useEffect(() => {
    if (!quiz) return

    // Setting up real-time player listeners for ALL quiz states (including waiting)
    console.log('🔄 Setting up real-time player listener for quiz state:', quizState)
    
    // Listen for changes in the players collection
    const unsubscribePlayers = onSnapshot(
      collection(db, `quizzes/${quizId}/players`),
      (snapshot) => {
        // Players collection updated - refresh immediately
        console.log('👥 Players collection changed, refreshing count...')
        setRealtimeConnected(true)
        loadPlayers()
      },
      (err) => {
        console.warn('👥 Player sync error:', err.message)
        setRealtimeConnected(false)
      }
    )

    return () => unsubscribePlayers()
  }, [quiz, quizId]) // Removed quizState dependency to ensure it works in all states

  // Timer Logic (skip on rating step)
  useEffect(() => {
    if (isRatingStep) return

    if (quizState === 'active' && !showResults && !hasAnswered && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
    
    // Auto-submit for players when timer reaches 0
    if (!isHost && timer === 0 && !hasAnswered && quizState === 'active' && !showResults) {
      setHasAnswered(true)
      // Check if there's a valid answer to submit
      const hasValidAnswer = selectedAnswer !== null && (
        typeof selectedAnswer === 'string' ? selectedAnswer.trim() !== '' : true
      )
      if (hasValidAnswer) {
        // Submit the selected answer
        submitAnswer()
      }
    }
  }, [timer, quizState, showResults, hasAnswered, isHost, selectedAnswer, isRatingStep])
  
  // Close host menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHostMenu && !event.target.closest('.host-menu-container')) {
        setShowHostMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHostMenu])

  // Load Players Data
  const loadPlayers = async () => {
    try {
      console.log('🔄 Loading players for quiz:', quizId)
      const leaderboardData = await calculateLeaderboard(quizId)
      if (leaderboardData) {
        const prevCount = players.length
        const newCount = leaderboardData.length
        
        console.log('✅ Players updated:', newCount, 'participants (was:', prevCount, ')')
        
        setLeaderboard(leaderboardData)
        setPlayers(leaderboardData) // Players are same as leaderboard entries
        
        // Trigger visual feedback if count changed
        if (newCount !== prevCount) {
          setPlayersCountUpdated(true)
          setTimeout(() => setPlayersCountUpdated(false), 1000)
        }
      } else {
        console.log('⚠️ No player data received')
        setLeaderboard([])
        setPlayers([])
      }
    } catch (err) {
      console.error('❌ Failed to load players:', err)
      // Don't reset players on error to avoid flickering
    }
  }

  // HOST FUNCTIONS
  const startQuiz = async () => {
    if (!isHost) return
    
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        status: 'active',
        currentQuestion: 0,
        showResults: false,
        showLeaderboard: false,
        startedAt: new Date().toISOString()
      })
      success('Quiz started!')
      console.log('▶️ Quiz started by host')
    } catch (err) {
      console.error('Failed to start quiz:', err)
      error('Failed to start quiz')
    }
  }

  const showQuestionResults = async () => {
    if (!isHost) return
    
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        showResults: true
      })
      console.log('👁️ Results shown by host')
    } catch (err) {
      console.error('Failed to show results:', err)
      error('Failed to show results')
    }
  }

  const nextQuestion = async () => {
    if (!isHost) return
    
    try {
      const questionsCount = quiz?.questions?.length || 0
      const includeRating = !!quiz?.enableRating
      const total = questionsCount + (includeRating ? 1 : 0)
      const nextIndex = currentQuestionIndex + 1
      
      if (nextIndex < total) {
        // Move to next step (either next question or rating step)
        await updateDoc(doc(db, 'quizzes', quizId), {
          currentQuestion: nextIndex,
          showResults: false
        })
        console.log(`➡️ Moved to step ${nextIndex + 1} of ${total}${nextIndex === questionsCount ? ' (rating)' : ''}`)
      } else {
        // Finish quiz and immediately show leaderboard
        await updateDoc(doc(db, 'quizzes', quizId), {
          status: 'finished',
          showResults: false,
          showLeaderboard: true,
          endedAt: new Date().toISOString()
        })
        success('Quiz completed!')
        console.log('🏁 Quiz finished by host (leaderboard shown)')
      }
    } catch (err) {
      console.error('Failed to advance quiz:', err)
      error('Failed to advance quiz')
    }
  }

  const finishQuizNow = async () => {
    if (!isHost) return
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        status: 'finished',
        showResults: false,
        showLeaderboard: true,
        endedAt: new Date().toISOString()
      })
      success('Quiz completed!')
      console.log('🏁 Quiz finished by host from rating step (leaderboard shown)')
    } catch (err) {
      console.error('Failed to finish quiz:', err)
      error('Failed to finish quiz')
    }
  }

  const showFinalLeaderboard = async () => {
    if (!isHost) return
    
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        showLeaderboard: true
      })
      await loadPlayers() // Refresh leaderboard
      console.log('🏆 Final leaderboard shown')
    } catch (err) {
      console.error('Failed to show leaderboard:', err)
      error('Failed to show leaderboard')
    }
  }

  // Submit anonymous rating
  const submitRating = async () => {
    if (!quiz?.enableRating) return
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      error('Please select a rating')
      return
    }
    try {
      await addDoc(collection(db, `quizzes/${quizId}/ratings`), {
        rating: ratingValue,
        feedback: ratingValue <= 3 ? (ratingFeedback || '') : (ratingFeedback || ''),
        createdAt: serverTimestamp()
      })
      localStorage.setItem(`quizRated:${quizId}`, 'true')
      setRatingSubmitted(true)
      success('Thanks for rating!')
    } catch (err) {
      console.error('Failed to submit rating:', err)
      error('Failed to submit rating. Please try again.')
    }
  }

  // PLAYER FUNCTIONS
  const submitAnswer = async () => {
    // Check if answer is provided (null for MCQ/True-False, empty string for word questions)
    const hasValidAnswer = selectedAnswer !== null && (
      typeof selectedAnswer === 'string' ? selectedAnswer.trim() !== '' : true
    )
    
    if (!hasValidAnswer || hasAnswered || !playerId) {
      if (!playerId) error('Player ID not found. Please rejoin the quiz.')
      if (!hasValidAnswer) error('Please provide an answer before submitting.')
      return
    }
    
    // Immediately update UI for instant feedback
    setIsSubmitting(true)
    setHasAnswered(true)
    info('Answer submitted!')
    
    try {
      const currentQuestion = quiz.questions[currentQuestionIndex]
      
      // Handle case-insensitive comparison for word questions
      let isCorrect = false
      if (currentQuestion.type === 'word') {
        isCorrect = selectedAnswer?.toString().toLowerCase() === currentQuestion.correctAnswer?.toLowerCase()
      } else {
        isCorrect = selectedAnswer === currentQuestion.correctAnswer
      }
      
      // IMPROVED: Millisecond-precise scoring for accurate leaderboard
      // Each question is worth 100 points base, with time bonus based on milliseconds
      const questionTimeMs = (quiz.questionTime || 30) * 1000 // Convert to milliseconds
      const remainingTimeMs = timer * 1000 // Convert timer to milliseconds
      
      // Calculate time bonus: faster submissions get more points
      // Time bonus can be up to 50 points (half of base score)
      const timeBonus = isCorrect ? Math.max(0, Math.round((remainingTimeMs / questionTimeMs) * 50)) : 0
      const totalScore = isCorrect ? 100 + timeBonus : 0
      
      // Store submission timestamp for precise tiebreaking
      const submissionTime = Date.now()
      // Approximate response time: how long the player took to answer the question
      const responseTimeMs = Math.max(0, questionTimeMs - remainingTimeMs)
      
      console.log(`✅ Answer submitted: ${selectedAnswer}, Correct: ${isCorrect}, Score: ${totalScore}, responseTimeMs=${responseTimeMs}`)
      
      // Submit answer to Firebase (non-blocking UI)
      submitAnswerToContext(quizId, playerId, currentQuestionIndex, selectedAnswer, isCorrect, timeBonus, submissionTime, responseTimeMs)
        .then(() => {
          // Refresh leaderboard after successful submission (background task)
          loadPlayers()
          setIsSubmitting(false)
        })
        .catch((err) => {
          console.error('Failed to submit answer:', err)
          error('Failed to submit answer. Please try again.')
          setHasAnswered(false) // Allow retry on failure
          setIsSubmitting(false)
        })
        
    } catch (err) {
      console.error('Failed to process answer:', err)
      error('Failed to submit answer')
      setHasAnswered(false)
      setIsSubmitting(false)
    }
  }

  // RENDER HELPERS
  const renderWaitingScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-8 text-center"
    >
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-blue-600" />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        {isHost ? 'Ready to Start?' : 'Waiting for Host'}
      </h2>
      
      <p className="text-xl text-gray-600 mb-8">
        {isHost 
          ? 'Click start when all players have joined'
          : 'The quiz will begin when the host starts it'
        }
      </p>
      
      <div className="text-sm text-gray-500 mb-6">
        Players Online: {players.length} | You are: {isHost ? 'Host' : 'Player'}
      </div>
      
      {isHost && (
        <button
          onClick={startQuiz}
          className="btn btn-primary text-lg px-8 py-4"
        >
          <Play className="w-5 h-5" />
          Start Quiz
        </button>
      )}
    </motion.div>
  )

  const renderActiveQuestion = () => {
    const currentQuestion = isRatingStep ? null : quiz.questions[currentQuestionIndex]

    // Rating step as a mandatory final step (acts like a question)
    if (isRatingStep) {
      return (
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-4 sm:p-6 lg:p-8 xl:p-10 pt-10 sm:pt-6"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-2">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-primary-600">
                  {currentQuestionIndex + 1}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Question {currentQuestionIndex + 1} of {totalSteps}
              </h2>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              Rate your experience
            </h3>
          </div>

          {/* Rating UI for players */}
          {!isHost && (
            <div className="max-w-xl mx-auto">
              {!ratingSubmitted ? (
                <>
                  <p className="text-sm text-gray-600 mb-4 text-center">Your response is required and anonymous.</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1,2,3,4,5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRatingValue(s)}
                    className={`group p-3 rounded-2xl border transition-all duration-200 ${ratingValue >= s ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-yellow-200' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    aria-label={`${s} star${s>1?'s':''}`}
                  >
                    <Star className={`w-7 h-7 ${ratingValue >= s ? 'text-yellow-500' : 'text-gray-300 group-hover:text-gray-400'}`} fill={ratingValue >= s ? '#F59E0B' : 'none'} />
                  </button>
                ))}
              </div>
                  {ratingValue && ratingValue <= 3 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Optional feedback</label>
                      <textarea
                        value={ratingFeedback}
                        onChange={(e) => setRatingFeedback(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-200"
                        placeholder="What could be improved? (optional)"
                        rows={3}
                      />
                    </div>
                  )}
                  <div className="flex justify-center">
                    <button
                      onClick={submitRating}
                      disabled={!ratingValue}
                      className="btn btn-primary px-8 py-4 disabled:opacity-50"
                    >
                      Submit Rating
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>Thanks for your feedback!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Host controls for rating step */}
          {isHost && (
            <div className="text-center mt-6">
              <button
                onClick={finishQuizNow}
                className="btn btn-primary text-lg px-8 py-4"
              >
                Finish Quiz
              </button>
            </div>
          )}
        </motion.div>
      )
    }
    
    return (
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card p-4 sm:p-6 lg:p-8 xl:p-10 pt-10 sm:pt-6"
      >
        {/* Question Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-16 sm:h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <span className="text-lg sm:text-2xl font-bold text-primary-600">
              {currentQuestionIndex + 1}
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
            Question {currentQuestionIndex + 1} of {totalSteps}
          </h2>
        </div>

        {/* Question Text */}
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-relaxed px-2">
            {currentQuestion.text}
          </h3>
          
          {/* Prominent Timer for Players */}
          {!isHost && quizState === 'active' && !showResults && (
            <div className="mt-6 flex justify-center">
              {!hasAnswered ? (
                <div className={`inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-lg sm:text-xl ${
                  timer <= 0 ? 'bg-red-200 text-red-800' :
                  timer <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 
                  timer <= 10 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  <Clock className="w-6 h-6" />
                  <span>{timer <= 0 ? 'Time\'s up!' : `${timer}s remaining`}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>


        {/* Answer Options */}
        {currentQuestion.type === 'mcq' && (
          <div className="space-y-4 mb-8">
            {currentQuestion.options.map((option, index) => {
              // Show stats to host always, to players when results are shown
              const shouldShowStats = isHost || showResults
              const totalResponses = shouldShowStats ? Object.values(statsAnswerStats || {}).reduce((sum, count) => sum + count, 0) : 0
              const optionCount = shouldShowStats ? (statsAnswerStats ? (statsAnswerStats[index] || 0) : 0) : 0
              const percentage = shouldShowStats && totalResponses > 0 ? Math.round((optionCount / totalResponses) * 100) : 0
              
              // Color scheme for percentage bars
              const colors = [
                'from-blue-500 to-blue-600',
                'from-purple-500 to-purple-600', 
                'from-pink-500 to-pink-600',
                'from-green-500 to-green-600',
                'from-orange-500 to-orange-600',
                'from-red-500 to-red-600',
              ]
              
              const correctColor = 'from-emerald-500 to-emerald-600'
              const isCorrectAnswer = showResults && index === currentQuestion.correctAnswer
              const barColor = isCorrectAnswer ? correctColor : colors[index % colors.length]
              
              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: isHost ? 1 : 1.02 }}
                  whileTap={{ scale: isHost ? 1 : 0.98 }}
                  onClick={() => !isHost && !hasAnswered && setSelectedAnswer(index)}
                  disabled={isHost || hasAnswered}
                  className={`relative w-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    selectedAnswer === index && !isHost
                      ? 'border-primary-500 shadow-lg shadow-primary-200/50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    isCorrectAnswer
                      ? 'border-emerald-300 shadow-lg shadow-emerald-200/50'
                      : ''
                  } ${
                    showResults && selectedAnswer === index && index !== currentQuestion.correctAnswer
                      ? 'border-red-300 shadow-lg shadow-red-200/50'
                      : ''
                  } ${
                    isHost ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  {/* Background percentage fill bar - only show when results should be visible */}
                  {shouldShowStats && showResults && totalResponses > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 1.2, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} opacity-20`}
                    />
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between p-3 sm:p-4 min-h-[60px] sm:min-h-[70px]">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                        selectedAnswer === index && !isHost
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : isCorrectAnswer
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={`text-sm sm:text-lg font-medium flex-1 text-left ${
                        isCorrectAnswer ? 'text-emerald-800 font-semibold' : 'text-gray-900'
                      }`}>
                        {option}
                      </span>
                    </div>
                    
                    {/* Show percentage and count when results should be visible */}
                    {shouldShowStats && showResults && totalResponses > 0 && (
                      <div className="flex items-center space-x-3">
                        {isCorrectAnswer && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.5, type: "spring", stiffness: 300 }}
                          >
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </motion.div>
                        )}
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.7, duration: 0.3 }}
                          className="text-right"
                        >
                          <div className={`text-xl font-bold ${
                            isCorrectAnswer ? 'text-emerald-700' : 'text-gray-800'
                          }`}>
                            {percentage}%
                          </div>
                          <div className={`text-xs ${
                            isCorrectAnswer ? 'text-emerald-600' : 'text-gray-600'
                          }`}>
                            ({optionCount} votes)
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}


        {/* True/False Questions */}
        {currentQuestion.type === 'truefalse' && (
          <div className="grid grid-cols-2 gap-6 mb-8">
            {['True', 'False'].map((option, index) => {
              // Show stats to host always, to players when results are shown
              const shouldShowStats = isHost || showResults
              const totalResponses = shouldShowStats ? Object.values(statsAnswerStats || {}).reduce((sum, count) => sum + count, 0) : 0
              const optionCount = shouldShowStats ? (statsAnswerStats ? (statsAnswerStats[index] || 0) : 0) : 0
              const percentage = shouldShowStats && totalResponses > 0 ? Math.round((optionCount / totalResponses) * 100) : 0
              
              const correctColor = 'from-emerald-500 to-emerald-600'
              const falseColor = 'from-red-500 to-red-600'
              const trueColor = 'from-blue-500 to-blue-600'
              const isCorrectAnswer = showResults && index === currentQuestion.correctAnswer
              const barColor = isCorrectAnswer ? correctColor : (index === 0 ? trueColor : falseColor)
              
              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: isHost ? 1 : 1.02 }}
                  whileTap={{ scale: isHost ? 1 : 0.98 }}
                  onClick={() => !isHost && !hasAnswered && setSelectedAnswer(index)}
                  disabled={isHost || hasAnswered}
                  className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    selectedAnswer === index && !isHost
                      ? 'border-primary-500 shadow-lg shadow-primary-200/50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    isCorrectAnswer
                      ? 'border-emerald-300 shadow-lg shadow-emerald-200/50'
                      : ''
                  } ${
                    showResults && selectedAnswer === index && index !== currentQuestion.correctAnswer
                      ? 'border-red-300 shadow-lg shadow-red-200/50'
                      : ''
                  } ${
                    isHost ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  {/* Background percentage fill bar */}
                  {shouldShowStats && showResults && totalResponses > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.2 + 0.3, duration: 1.2, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} opacity-20`}
                    />
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10 p-6 min-h-[120px] flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold mb-2 ${
                      isCorrectAnswer ? 'text-emerald-700' : 'text-gray-900'
                    }`}>
                      {option}
                    </span>
                    
                    {shouldShowStats && showResults && totalResponses > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.2 + 0.7, duration: 0.3 }}
                        className="flex items-center space-x-2"
                      >
                        {isCorrectAnswer && (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                        <span className={`text-lg font-bold ${
                          isCorrectAnswer ? 'text-emerald-700' : 'text-gray-700'
                        }`}>
                          {percentage}%
                        </span>
                        <span className={`text-sm ${
                          isCorrectAnswer ? 'text-emerald-600' : 'text-gray-600'
                        }`}>
                          ({optionCount})
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Word Answer Questions */}
        {currentQuestion.type === 'word' && (
          <div className="mb-8">
            {!isHost ? (
              // Player input
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Enter your answer:</h4>
                  <p className="text-sm text-gray-500">Type a single word</p>
                </div>
                <input
                  type="text"
                  value={selectedAnswer || ''}
                  onChange={(e) => {
                    // Only allow single word (no spaces)
                    const value = e.target.value.replace(/\s+/g, '')
                    setSelectedAnswer(value)
                  }}
                  disabled={isHost || hasAnswered}
                  className={`w-full text-center text-xl font-medium px-6 py-4 border-2 rounded-2xl transition-all duration-200 ${
                    hasAnswered ? 'border-green-300 bg-green-50' : 'border-gray-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-200'
                  }`}
                  placeholder="Your answer..."
                  maxLength={50}
                />
                {showResults && (
                  <div className="mt-4 text-center">
                    <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedAnswer?.toLowerCase() === currentQuestion.correctAnswer?.toLowerCase()
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedAnswer?.toLowerCase() === currentQuestion.correctAnswer?.toLowerCase()
                        ? `✅ Correct! "${currentQuestion.correctAnswer}"`
                        : `❌ Incorrect. Correct answer: "${currentQuestion.correctAnswer}"`
                      }
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Host view - show word cloud or list of answers when results are shown
              showResults && (
                <div className="max-w-4xl mx-auto">
                  <h4 className="text-lg font-semibold text-gray-700 text-center mb-6">Student Answers:</h4>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {Object.entries(statsAnswerStats || {}).map(([answer, count]) => {
                        const isCorrect = answer.toLowerCase() === currentQuestion.correctAnswer?.toLowerCase()
                        return (
                          <motion.div
                            key={answer}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium border-2 ${
                              isCorrect 
                                ? 'bg-green-100 border-green-300 text-green-800'
                                : 'bg-gray-100 border-gray-300 text-gray-700'
                            }`}
                          >
                            <span>"{answer}"</span>
                            <span className="bg-white px-2 py-1 rounded-full text-xs">{count}</span>
                            {isCorrect && <CheckCircle className="w-4 h-4" />}
                          </motion.div>
                        )
                      })}
                    </div>
                    {Object.keys(statsAnswerStats || {}).length === 0 && (
                      <p className="text-center text-gray-500">No answers submitted yet</p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <div className="text-center space-y-4">
          {isHost ? (
            // Host Controls
            <div className="space-x-4">
              {/* Hide results toggle on rating step */}
              {!isRatingStep && !showResults && (
                <button
                  onClick={showQuestionResults}
                  className="btn btn-secondary text-lg px-6 py-3"
                >
                  <Eye className="w-5 h-5" />
                  Show Results
                </button>
              )}
              
              {!isRatingStep && showResults && (
                <button
                  onClick={nextQuestion}
                  className="btn btn-primary text-lg px-6 py-3"
                >
                  <Play className="w-5 h-5" />
                  {currentQuestionIndex < (quiz.questions.length - 1) ? 'Next Question' : (quiz.enableRating ? 'Go to Rating' : 'Finish Quiz')}
                </button>
              )}
            </div>
          ) : (
            // Player Controls
            <div>
              {!hasAnswered && !showResults && (
                <button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null || (typeof selectedAnswer === 'string' && selectedAnswer.trim() === '') || isSubmitting}
                  className="btn btn-primary text-lg px-8 py-4 disabled:opacity-50 relative"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="ml-2">Submit Answer</span>
                    </>
                  )}
                </button>
              )}
              
              {hasAnswered && !showResults && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600 mb-2">
                    ✅ Answer Submitted
                  </div>
                  <p className="text-gray-600">Waiting for host to show results...</p>
                </div>
              )}
              
              {showResults && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600 mb-2">
                    📊 Results Revealed
                  </div>
                  <p className="text-gray-600">Waiting for next question...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const renderFinishedScreen = () => (
    <div>
      {/* Host gets detailed summary, players get simple completion message */}
      {isHost ? (
        <div>
          {/* Quiz Summary for Host */}
          <QuizSummary 
            quiz={quiz} 
            leaderboard={leaderboard} 
            isVisible={true}
            quizId={quizId}
          />
          
          {/* Host Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Quiz Completed! 🎉
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              All {quiz.questions?.length || 0} questions completed with {leaderboard.length} participants!
            </p>
            
            <div className="space-x-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-outline text-lg px-6 py-3"
              >
                Back to Home
              </button>
              <button
                onClick={() => navigate('/create')}
                className="btn btn-secondary text-lg px-6 py-3"
              >
                Create New Quiz
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Player View - Simple completion message */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Quiz Completed! 🎉
          </h2>
          
          <p className="text-xl text-gray-600 mb-8">
            Thanks for participating! Check the leaderboard to see your results.
          </p>
          
          {/* Show player's performance */}
          {(() => {
            const currentPlayer = leaderboard.find(p => p.id === playerId)
            const playerRank = leaderboard.findIndex(p => p.id === playerId) + 1
            if (currentPlayer) {
              return (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Your Results</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{currentPlayer.score}</div>
                      <div className="text-sm text-gray-600">Points Earned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{currentPlayer.correctAnswers || 0}/{quiz.questions?.length || 0}</div>
                      <div className="text-sm text-gray-600">Correct Answers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">#{playerRank}</div>
                      <div className="text-sm text-gray-600">Your Rank</div>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}
          
          {/* Removed inline final leaderboard to avoid duplication; right panel shows it */}
          {false && showLeaderboard && leaderboard.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🏆 Final Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.id === playerId ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      <span className={`font-semibold ${
                        player.id === playerId ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {player.name} {player.id === playerId ? '(You)' : ''}
                      </span>
                    </div>
                    <span className={`font-bold ${
                      player.id === playerId ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {player.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-x-4">
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary text-lg px-6 py-3"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )

  // MAIN RENDER
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Quiz...</h2>
          <p className="text-gray-600">Setting up your quiz room</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Quiz Not Found</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Clean Quiz Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-500/10 via-white/95 to-secondary-500/10 backdrop-blur-xl border-b border-primary-200/30 shadow-lg shadow-primary-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Single Row - Clean Navigation */}
          <div className="flex items-center justify-between h-16">
            {/* Left Section - Logo & Back */}
            <div className="flex items-center space-x-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="flex items-center space-x-3 text-gray-700 hover:text-primary-600 transition-colors duration-200 group"
              >
                <div className="p-2.5 rounded-full bg-white group-hover:bg-gray-50 border border-primary-200/50 group-hover:border-primary-300 transition-all duration-200 shadow-md shadow-primary-500/10">
                  <ArrowLeft className="w-5 h-5 text-primary-600" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold text-gradient">Quizzer</span>
                  <div className="text-xs text-gray-500 font-medium">Quiz Room</div>
                </div>
              </motion.button>
              
              {/* Quiz Title & Progress */}
              <div className="hidden md:block border-l border-primary-200/50 pl-6">
                <h1 className="text-lg font-semibold text-gray-800 truncate max-w-64">{quiz.title}</h1>
                {quizState === 'active' && (
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-sm text-gray-600 font-medium">
                      {currentQuestionIndex + 1} of {totalSteps}
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full h-1.5 transition-all duration-300 shadow-sm"
                        style={{ width: `${totalSteps > 0 ? (((currentQuestionIndex + 1) / totalSteps) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Section - Controls */}
            <div className="flex items-center space-x-3">
              {/* Quiz State Badge */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm ${
                quizState === 'waiting' ? 'bg-gradient-to-r from-blue-50 to-primary-50 text-blue-700 border-blue-200' :
                quizState === 'active' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200' :
                quizState === 'finished' ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 border-primary-200' :
                'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200'
              }`}>
                {quizState === 'waiting' && <><Users className="w-3.5 h-3.5" /> Waiting</>}
                {quizState === 'active' && <><Play className="w-3.5 h-3.5" /> Live</>}
                {quizState === 'finished' && <><Trophy className="w-3.5 h-3.5" /> Finished</>}
              </div>
              
              {/* Timer Display */}
              {quizState === 'active' && !showResults && (
                <motion.div 
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border font-medium text-sm shadow-sm ${
                    timer <= 5 ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 animate-pulse' :
                    timer <= 10 ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200' :
                    'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 border-primary-200'
                  }`}
                  animate={timer <= 5 ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 1, repeat: timer <= 5 ? Infinity : 0 }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timer}s</span>
                </motion.div>
              )}
              
              {/* Players Count */}
              <motion.div 
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border font-medium text-sm shadow-sm ${
                  playersCountUpdated ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 border-primary-200' : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border-gray-200'
                }`}
                animate={playersCountUpdated ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{players.length}</span>
                <motion.div
                  className={`w-1.5 h-1.5 rounded-full ${
                    realtimeConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  animate={realtimeConnected ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                  transition={{ duration: 2, repeat: realtimeConnected ? Infinity : 0 }}
                />
              </motion.div>
              
              {/* Room Code (Host only) */}
              {isHost && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full border font-medium text-sm shadow-sm bg-gradient-to-r from-purple-50 to-primary-50 text-purple-700 border-purple-200">
                  <span className="text-xs text-gray-500 font-semibold">Code</span>
                  <span className="font-mono tracking-widest text-gray-900">
                    {quizId.slice(-6).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* User Role */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm ${
                isHost ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 border-amber-200' : 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 border-primary-200'
              }`}>
                {isHost ? '👑 Host' : '👤 Player'}
              </div>
              
              {/* Host Actions */}
              {isHost && (
                <div className="flex items-center space-x-2">
                  {/* Quick Start Button */}
                  {quizState === 'waiting' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startQuiz}
                      className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl transition-all duration-200 font-medium shadow-lg shadow-green-500/25 text-sm"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Quiz</span>
                    </motion.button>
                  )}
                  
                  {/* Host Menu */}
                  <div className="relative host-menu-container">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowHostMenu(!showHostMenu)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    
                    <AnimatePresence>
                      {showHostMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                        >
                          {/* Host Controls */}
                          {quizState === 'waiting' && (
                            <button
                              onClick={() => { startQuiz(); setShowHostMenu(false) }}
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center space-x-3 transition-colors duration-150"
                            >
                              <Play className="w-4 h-4 text-green-600" />
                              <span>Start Quiz</span>
                            </button>
                          )}
                          
                          {quizState === 'active' && !showResults && (
                            <button
                              onClick={() => { showQuestionResults(); setShowHostMenu(false) }}
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors duration-150"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                              <span>Show Results</span>
                            </button>
                          )}
                          
                          {quizState === 'active' && showResults && (
                            <button
                              onClick={() => { nextQuestion(); setShowHostMenu(false) }}
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center space-x-3 transition-colors duration-150"
                            >
                              <Play className="w-4 h-4 text-primary-600" />
                              <span>{currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                            </button>
                          )}
                          
                          {quizState === 'finished' && !showLeaderboard && (
                            <button
                              onClick={() => { showFinalLeaderboard(); setShowHostMenu(false) }}
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-3 transition-colors duration-150"
                            >
                              <BarChart3 className="w-4 h-4 text-purple-600" />
                              <span>Show Final Results</span>
                            </button>
                          )}
                          
                          <div className="border-t border-gray-100 my-2"></div>
                          
                          <button
                            onClick={() => { navigate('/'); setShowHostMenu(false) }}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors duration-150"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>End & Leave Quiz</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Quiz Info */}
          <div className="md:hidden pb-4 pt-2 border-t border-primary-100/50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 truncate">{quiz.title}</h2>
                {quizState === 'active' && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600 font-medium">
                      Question {currentQuestionIndex + 1} of {totalSteps}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full h-1.5 transition-all duration-300 shadow-sm"
                        style={{ width: `${totalSteps > 0 ? (((currentQuestionIndex + 1) / totalSteps) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Mobile Start Button for Host */}
              {isHost && quizState === 'waiting' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startQuiz}
                  className="sm:hidden flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg shadow-green-500/25"
                >
                  <Play className="w-4 h-4" />
                  <span>Start</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile spacer to offset fixed header height */}
      <div className="sm:hidden h-12"></div>

      {/* Main Content */}
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 mt-32 sm:mt-20 md:mt-16">
        {(quizState === 'active' || quizState === 'finished') ? (
          <div className={`${showResults && quizState === 'active' ? 'space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 gap-3 xl:gap-3' : 'space-y-6 lg:space-y-0 lg:grid lg:gap-6 lg:grid-cols-5'}`}>
            {/* Quiz Content - Mobile-first approach */}
            <div className={`${showResults && quizState === 'active' ? 'lg:col-span-5 xl:col-span-5' : 'lg:col-span-3'}`}>
              <AnimatePresence mode="wait">
                {quizState === 'active' && renderActiveQuestion()}
                {quizState === 'finished' && renderFinishedScreen()}
              </AnimatePresence>
            </div>
            
            {/* When showResults is true and quiz is active, show STATS in the middle */}
            {showResults && quizState === 'active' && (
              <div className="lg:col-span-4 xl:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-6">
                    <QuizDashboard
                      quiz={quiz}
                      currentQuestion={quiz?.questions[currentQuestionIndex]}
                      currentQuestionIndex={currentQuestionIndex}
                      showResults={showResults}
                      answerStats={(isHost || showResults) ? (statsAnswerStats || {}) : {}}
                      leaderboard={(isHost || showResults) ? (statsLeaderboard.length > 0 ? statsLeaderboard : leaderboard) : []}
                      currentPlayerId={playerId}
                      isHost={isHost}
                      className="transition-all duration-300"
                      mediumWidth
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Right Panel - Leaderboard when active+results, Stats/Final Leaderboard otherwise */}
            <div className={`${showResults && quizState === 'active' ? 'lg:col-span-3 xl:col-span-3' : 'lg:col-span-2'}`}>
              <div className="lg:sticky lg:top-24">
                {quizState === 'finished' ? (
                  // Show final leaderboard instead of analytics
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">🏁 Final Leaderboard</h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {(leaderboard || []).slice(0, 20).map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            index === 0 ? 'bg-yellow-50 border-yellow-200' :
                            index === 1 ? 'bg-gray-50 border-gray-200' :
                            index === 2 ? 'bg-orange-50 border-orange-200' :
                            'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300 text-gray-800'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{player.name}</div>
                              <div className="text-xs text-gray-600">{player.correctAnswers || 0}/{quiz.questions?.length || 0} correct</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{player.score} pts</div>
                            <div className="text-xs text-gray-600">{(quiz.questions?.length || 0) > 0 ? Math.round(((player.correctAnswers || 0) / (quiz.questions?.length || 0)) * 100) : 0}%</div>
                          </div>
                        </div>
                      ))}
                      {(!leaderboard || leaderboard.length === 0) && (
                        <div className="text-sm text-gray-600">No participants.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  // When active+results, show Leaderboard on the right; otherwise show stats
                  showResults && quizState === 'active' ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 lg:p-6 h-fit">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="text-xl mr-2">🏆</span>
                        Leaderboard
                      </h4>
                      <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[600px] lg:max-h-[700px] overflow-y-auto">
                        {(statsLeaderboard.length > 0 ? statsLeaderboard : leaderboard || []).slice(0, 20).map((player, index) => (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-colors hover:shadow-sm ${
                              index === 0 ? 'bg-yellow-50 border-yellow-200' :
                              index === 1 ? 'bg-gray-50 border-gray-200' :
                              index === 2 ? 'bg-orange-50 border-orange-200' :
                              'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300 text-gray-800'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 truncate">{player.name}</div>
                                <div className="text-xs text-gray-600">{player.correctAnswers || 0}/{quiz.questions?.length || 0} correct</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{player.score} pts</div>
                              <div className="text-xs text-gray-600">{(quiz.questions?.length || 0) > 0 ? Math.round(((player.correctAnswers || 0) / (quiz.questions?.length || 0)) * 100) : 0}%</div>
                            </div>
                          </div>
                        ))}
                        {(!statsLeaderboard || statsLeaderboard.length === 0) && (!leaderboard || leaderboard.length === 0) && (
                          <div className="text-sm text-gray-600">No participants yet.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <QuizDashboard
                      quiz={quiz}
                      currentQuestion={quiz?.questions[currentQuestionIndex]}
                      currentQuestionIndex={currentQuestionIndex}
                      showResults={showResults}
                      answerStats={(isHost || showResults) ? (statsAnswerStats || {}) : {}}
                      leaderboard={(isHost || showResults) ? (statsLeaderboard.length > 0 ? statsLeaderboard : leaderboard) : []}
                      currentPlayerId={playerId}
                      isHost={isHost}
                      className="transition-all duration-300"
                      mediumWidth={showResults && quizState === 'active'}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          // Waiting Screen - Full Width
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {quizState === 'waiting' && renderWaitingScreen()}
            </AnimatePresence>
          </div>
        )}
        
      </div>
    </div>
  )
}

export default QuizRoom