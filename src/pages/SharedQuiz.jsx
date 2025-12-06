import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Edit3, 
  Play, 
  Share2, 
  Lock, 
  User, 
  Clock, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useQuiz } from '../contexts/QuizContext'
import { useToast } from '../contexts/ToastContext'
import AuthenticationModal from '../components/AuthenticationModal'
import { getSharedQuiz, createQuizCopy } from '../services/QuizSharingService'

const SharedQuiz = () => {
  const { shareId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { createQuiz } = useQuiz()
  const { success, error } = useToast()
  
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [actionType, setActionType] = useState(null) // 'edit' or 'launch'
  const [hasShownError, setHasShownError] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)

  // Clean up old shared data on component mount
  useEffect(() => {
    const cleanupOldSharedData = () => {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      const keysToRemove = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('shared_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key))
            if (data.sharedAt && data.sharedAt < sevenDaysAgo) {
              keysToRemove.push(key)
            }
          } catch (e) {
            // Remove invalid data
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    cleanupOldSharedData()
  }, [])

  // Load shared quiz data
  useEffect(() => {
    const loadSharedQuiz = async () => {
      try {
        setLoading(true)
        setHasShownError(false) // Reset error state on new load
        
        // Try to get shared quiz data from localStorage
        let quizData = null
        const sharedData = localStorage.getItem(`shared_${shareId}`)
        
        console.log('🔍 Looking for shared data with key:', `shared_${shareId}`)
        console.log('📦 Found shared data:', sharedData ? 'Yes' : 'No')
        
        // Debug: List all shared keys in localStorage
        const allSharedKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('shared_')) {
            allSharedKeys.push(key)
          }
        }
        console.log('🗂️ All shared keys in localStorage:', allSharedKeys)
        
        // Store debug info for display
        setDebugInfo({
          shareId,
          expectedKey: `shared_${shareId}`,
          foundData: !!sharedData,
          allSharedKeys,
          timestamp: new Date().toISOString()
        })
        
        if (sharedData) {
          try {
            const data = JSON.parse(sharedData)
            
            // Validate shared data structure (but don't throw error, just log warning)
            if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
              console.warn('⚠️ Shared quiz has no questions:', data)
              // Don't throw error, let it continue and use fallback if needed
            }
            
            // Check if shared data is too old (7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
            if (data.sharedAt && data.sharedAt < sevenDaysAgo) {
              localStorage.removeItem(`shared_${shareId}`)
              throw new Error('Share link has expired')
            }
            
            console.log('✅ Parsed shared data:', data)
            console.log('📝 Questions found:', data.questions?.length || 0)
            
            quizData = {
              id: data.id,
              title: data.title || 'Shared Quiz',
              description: data.description || '',
              questions: data.questions || [],
              questionTime: data.questionTime || 30,
              showAnswers: data.showAnswers || 'live',
              enableRating: data.enableRating || false,
              createdBy: data.sharedBy || "unknown",
              createdAt: new Date().toISOString(),
              status: data.type || 'draft',
              isOwner: currentUser?.uid === data.sharedBy
            }
          } catch (e) {
            console.error('Failed to parse shared data:', e)
            if (!hasShownError) {
              error(e.message || 'Failed to load shared quiz data')
              setHasShownError(true)
            }
          }
        } else {
          // If no localStorage data found, try to use Firebase as fallback
          console.log('🔄 No localStorage data found, trying Firebase fallback...')
          try {
            // Try direct Firebase document access first (new approach)
            const { doc, getDoc } = await import('firebase/firestore')
            const { db } = await import('../firebase/config')
            
            const shareDoc = await getDoc(doc(db, 'quiz_shares', shareId))
            
            if (shareDoc.exists()) {
              const firebaseData = shareDoc.data()
              console.log('✅ Firebase data retrieved:', firebaseData)
              
              // Use the embedded quiz data if available
              if (firebaseData.quizData) {
                const data = firebaseData.quizData
                quizData = {
                  id: data.id,
                  title: data.title || 'Shared Quiz',
                  description: data.description || '',
                  questions: data.questions || [],
                  questionTime: data.questionTime || 30,
                  showAnswers: data.showAnswers || 'live',
                  enableRating: data.enableRating || false,
                  createdBy: data.sharedBy || firebaseData.ownerId || "unknown",
                  createdAt: new Date().toISOString(),
                  status: data.type || firebaseData.type || 'draft',
                  isOwner: currentUser?.uid === firebaseData.ownerId
                }
                console.log('✅ Using embedded quiz data from Firebase')
              } else {
                // Fallback to the old service approach
                console.log('🔄 No embedded data, trying old Firebase service...')
                const firebaseQuizData = await getSharedQuiz(shareId)
                console.log('✅ Old Firebase service data retrieved:', firebaseQuizData)
                
                quizData = {
                  id: firebaseQuizData.id,
                  title: firebaseQuizData.title || 'Shared Quiz',
                  description: firebaseQuizData.description || '',
                  questions: firebaseQuizData.questions || [],
                  questionTime: firebaseQuizData.questionTime || 30,
                  showAnswers: firebaseQuizData.showAnswers || 'live',
                  enableRating: firebaseQuizData.enableRating || false,
                  createdBy: firebaseQuizData.createdBy || "unknown",
                  createdAt: firebaseQuizData.createdAt || new Date().toISOString(),
                  status: firebaseQuizData.status || 'draft',
                  isOwner: currentUser?.uid === firebaseQuizData.shareInfo?.ownerId
                }
              }
            } else {
              throw new Error('Share document not found in Firebase')
            }
          } catch (firebaseError) {
            console.log('❌ Firebase fallback also failed:', firebaseError.message)
            // Continue to the error handling below
          }
        }
        
        // Final validation
        console.log('🔍 Final quiz data check:', quizData)
        console.log('📊 Questions array:', quizData?.questions)
        console.log('🔢 Questions length:', quizData?.questions?.length)
        
        if (!quizData) {
          console.log('❌ No quiz data found at all')
          throw new Error('Quiz data not found. The share link may be invalid or expired.')
        } else if (!quizData.questions || quizData.questions.length === 0) {
          console.log('⚠️ Quiz data found but no questions')
          console.log('📋 Quiz data without questions:', quizData)
          throw new Error('Quiz has no questions')
        } else {
          console.log('✅ Valid quiz data loaded with', quizData.questions.length, 'questions')
        }
        
        setQuiz(quizData)
      } catch (err) {
        console.error('Failed to load shared quiz:', err)
        if (!hasShownError) {
          error(err.message || 'Failed to load quiz. The link may be invalid or expired.')
          setHasShownError(true)
        }
        setQuiz(null)
      } finally {
        setLoading(false)
      }
    }

    if (shareId && shareId.trim()) {
      loadSharedQuiz()
    } else if (!shareId) {
      setLoading(false)
      if (!hasShownError) {
        error('Invalid share link')
        setHasShownError(true)
      }
    }
  }, [shareId, currentUser])

  const handleAction = async (action) => {
    if (!currentUser) {
      setActionType(action)
      setShowAuthModal(true)
      return
    }

    try {
      if (action === 'edit') {
        // Create a local copy for editing using the existing draft system
        const draftPayload = {
          formData: {
            title: `${quiz.title} (Copy)`,
            description: quiz.description || '',
            questionTime: quiz.questionTime || 30,
            showAnswers: quiz.showAnswers || 'live',
            enableRating: quiz.enableRating || false
          },
          questions: quiz.questions.map((q, index) => ({
            id: Date.now() + index,
            text: q.text,
            type: q.type,
            options: q.type === 'mcq' ? q.options : (q.type === 'boolean' ? ['True', 'False'] : ['', '', '', '']),
            correctAnswer: q.correctAnswer
          })),
          timestamp: Date.now()
        }

        if (currentUser.isGuest) {
          // For guests, save to localStorage
          localStorage.setItem('quizDraft', JSON.stringify(draftPayload))
          success('Quiz copied for editing!')
          navigate('/create')
        } else {
          // For signed-in users, we'll save to localStorage for now since we don't have the service yet
          localStorage.setItem('quizDraft', JSON.stringify(draftPayload))
          success('Quiz copied for editing!')
          navigate('/create')
        }
      } else if (action === 'launch') {
        // Launch the quiz directly
        const quizData = {
          title: quiz.title,
          description: quiz.description || '',
          showAnswers: quiz.showAnswers || 'live',
          enableRating: quiz.enableRating || false,
          questionTime: quiz.questionTime || 30,
          questions: quiz.questions.map(q => ({
            text: q.text,
            type: q.type,
            options: q.type === 'mcq' ? q.options : (q.type === 'boolean' ? ['True', 'False'] : []),
            correctAnswer: q.correctAnswer
          })),
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || `guest_${Date.now()}`,
          status: 'waiting',
          currentQuestion: 0,
          showResults: false,
          showLeaderboard: false
        }

        const quizId = await createQuiz(quizData)
        
        // Set host information
        const hostId = currentUser?.uid || `guest_${Date.now()}`
        localStorage.setItem('userId', hostId)
        localStorage.setItem('isQuizHost', quizId)
        
        // Store metadata for success screen
        try {
          sessionStorage.setItem('launchedDraftMeta', JSON.stringify({
            title: quizData.title,
            questionTime: quizData.questionTime,
            questionsLength: quizData.questions.length
          }))
        } catch {}

        const code = quizId.slice(-6).toUpperCase()
        success('Quiz launched successfully!')
        navigate(`/create?launchedId=${quizId}&code=${code}`)
      }
    } catch (err) {
      console.error('Action failed:', err)
      error('Failed to perform action. Please try again.')
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    if (actionType) {
      handleAction(actionType)
      setActionType(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading shared quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
          <p className="text-gray-600 mb-4">The quiz link may be invalid or expired.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• The share link has expired (links expire after 7 days)</li>
              <li>• The quiz data was not properly saved when sharing</li>
              <li>• Your browser's local storage was cleared</li>
              <li>• The original quiz was deleted by the owner</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline w-full"
            >
              Try Again
            </button>
          </div>
          
          {/* Debug Info Panel */}
          {debugInfo && (
            <details className="mt-6">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Debug Information (for developers)
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-600">
                <div><strong>Share ID:</strong> {debugInfo.shareId}</div>
                <div><strong>Expected Key:</strong> {debugInfo.expectedKey}</div>
                <div><strong>Data Found:</strong> {debugInfo.foundData ? 'Yes' : 'No'}</div>
                <div><strong>Available Keys:</strong> {debugInfo.allSharedKeys.length > 0 ? debugInfo.allSharedKeys.join(', ') : 'None'}</div>
                <div><strong>Checked At:</strong> {debugInfo.timestamp}</div>
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/70 border-b border-white/20 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Shared Quiz</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Quiz Info Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {quiz.title}
                </h1>
                {quiz.description && (
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                )}
                
                {/* Quiz Stats */}
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>{quiz.questions.length} questions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.questionTime}s per question</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="capitalize">{quiz.status}</span>
                  </div>
                </div>
              </div>

              {/* Authentication Notice */}
              {!currentUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Sign in required</p>
                      <p className="text-xs text-blue-700 mt-1">
                        You need to sign in to edit or launch this quiz.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction('edit')}
                  className="w-full btn btn-primary text-base py-3"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>
                    {quiz.status === 'draft' ? 'Edit Quiz' : 'Create Copy to Edit'}
                  </span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction('launch')}
                  className="w-full btn btn-outline text-base py-3"
                >
                  <Play className="w-4 h-4" />
                  <span>Launch as Host</span>
                </motion.button>
              </div>

              {/* Owner Notice */}
              {quiz.isOwner && currentUser && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      You are the owner of this quiz
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Preview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Preview</h3>
              <div className="space-y-4">
                {quiz.questions.slice(0, 3).map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">{question.text}</p>
                        {question.type === 'mcq' && (
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="text-sm text-gray-600">
                                • {option}
                              </div>
                            ))}
                          </div>
                        )}
                        {question.type === 'boolean' && (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">• True</div>
                            <div className="text-sm text-gray-600">• False</div>
                          </div>
                        )}
                        {question.type === 'text' && (
                          <div className="text-sm text-gray-600 italic">
                            Text answer question
                          </div>
                        )}
                        {!['mcq', 'boolean', 'text'].includes(question.type) && (
                          <div className="text-sm text-gray-600 italic">
                            {question.type} question
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {quiz.questions.length > 3 && (
                  <div className="text-center text-sm text-gray-500">
                    ... and {quiz.questions.length - 3} more questions
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthenticationModal
            onClose={() => {
              setShowAuthModal(false)
              setActionType(null)
            }}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default SharedQuiz
