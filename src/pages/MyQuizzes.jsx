import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Pencil, Play, Trash2, Loader2, Plus, Share2, Copy, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useQuiz } from '../contexts/QuizContext'
import { useToast } from '../contexts/ToastContext'
import { listDrafts, deleteDraft, getDraft, saveDraft as saveDraftRemote } from '../services/DraftsService'
import { listHostedQuizzes } from '../services/QuizzesService'
import { generateShareLink, generateShareURL } from '../services/QuizSharingService'

const MyQuizzes = () => {
  const { currentUser } = useAuth()
  const { createQuiz } = useQuiz()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('drafts') // 'drafts' | 'previous'
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [loadingPrevious, setLoadingPrevious] = useState(true)
  const [drafts, setDrafts] = useState([])
  const [previous, setPrevious] = useState([])
  const [sharingStates, setSharingStates] = useState({}) // Track sharing states for each quiz

  const isGuest = !currentUser || currentUser.isGuest

  // Helper function to check if a draft is ready to launch
  const isDraftReady = (draft) => {
    if (!draft.formData?.title?.trim()) return false
    if (!Array.isArray(draft.questions) || draft.questions.length === 0) return false
    
    // Check if all questions have text and valid options for MCQ
    return draft.questions.every(q => {
      if (!q.text?.trim()) return false
      if (q.type === 'mcq' && (!q.options || q.options.length < 2 || q.options.some(opt => !opt?.trim()))) return false
      return true
    })
  }

  // Helper function to check if a completed quiz is ready to launch
  const isQuizReady = (quiz) => {
    if (!quiz.title?.trim()) return false
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) return false
    
    return quiz.questions.every(q => {
      if (!q.text?.trim()) return false
      if (q.type === 'mcq' && (!q.options || q.options.length < 2 || q.options.some(opt => !opt?.trim()))) return false
      return true
    })
  }

  // Load drafts
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoadingDrafts(true)
        if (isGuest) {
          const saved = localStorage.getItem('quizDraft')
          if (saved) {
            const data = JSON.parse(saved)
            if (active) setDrafts([{ id: 'local', ...data }])
          } else {
            if (active) setDrafts([])
          }
        } else {
          const items = await listDrafts(currentUser.uid)
          if (active) setDrafts(items)
        }
      } catch (e) {
        console.error(e)
        error('Failed to load drafts')
      } finally {
        if (active) setLoadingDrafts(false)
      }
    }
    load()
    return () => { active = false }
  }, [currentUser, isGuest, error])

  // Load previous quizzes
  useEffect(() => {
    let active = true
    const loadPrev = async () => {
      try {
        setLoadingPrevious(true)
        if (!currentUser || currentUser.isGuest) {
          if (active) setPrevious([])
          return
        }
        const items = await listHostedQuizzes(currentUser.uid)
        if (active) setPrevious(items)
      } catch (e) {
        console.error(e)
        error('Failed to load previous quizzes')
      } finally {
        if (active) setLoadingPrevious(false)
      }
    }
    loadPrev()
    return () => { active = false }
  }, [currentUser, error])

  const handleEdit = async (draftId) => {
    if (isGuest) {
      navigate('/create') // Create will auto-load local draft
      return
    }
    navigate(`/create?draftId=${draftId}`)
  }

  const handleLaunch = async (draft) => {
    try {
      // Validate minimal fields
      const { formData, questions } = draft
      if (!formData?.title || !Array.isArray(questions) || questions.length === 0) {
        error('Draft is incomplete. Please edit and complete before launching.')
        return
      }

      // Validate questions have text and proper structure
      const invalidQuestions = questions.filter(q => 
        !q.text?.trim() || 
        (q.type === 'mcq' && (!q.options || q.options.length < 2 || q.options.some(opt => !opt?.trim())))
      )
      
      if (invalidQuestions.length > 0) {
        error('Some questions are incomplete. Please edit and complete all questions before launching.')
        return
      }

      const sanitizedQuestionTime = Number(formData.questionTime) || 30

      const quizData = {
        title: formData.title,
        description: formData.description || '',
        showAnswers: formData.showAnswers || 'live',
        enableRating: !!formData.enableRating,
        questionTime: sanitizedQuestionTime,
        questions: questions.map(q => ({
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
      success('Quiz launched!')

      // Mark this client as the host for this quiz
      const hostId = currentUser?.uid || `guest_${Date.now()}`
      localStorage.setItem('userId', hostId)
      localStorage.setItem('isQuizHost', quizId)

      // Save lightweight meta so Create page can show info on success screen
      try {
        sessionStorage.setItem('launchedDraftMeta', JSON.stringify({
          title: formData.title || '',
          questionTime: sanitizedQuestionTime,
          questionsLength: Array.isArray(questions) ? questions.length : 0
        }))
      } catch {}

      // Remove draft after launch
      if (isGuest && draft.id === 'local') {
        try { localStorage.removeItem('quizDraft') } catch {}
        setDrafts(prev => prev.filter(d => d.id !== 'local'))
      } else if (!isGuest && draft.id !== 'local') {
        await deleteDraft(currentUser.uid, draft.id)
        setDrafts(prev => prev.filter(d => d.id !== draft.id))
      }

      // Refresh previous list so the launched quiz appears immediately
      if (!isGuest && currentUser?.uid) {
        try {
          const updated = await listHostedQuizzes(currentUser.uid)
          setPrevious(updated)
        } catch {}
      }

      // Navigate to Create page success screen instead of Quiz Room
      const code = quizId.slice(-6).toUpperCase()
      navigate(`/create?launchedId=${quizId}&code=${code}`)
    } catch (e) {
      console.error(e)
      error('Failed to launch quiz')
    }
  }

  const handleDelete = async (draftId) => {
    try {
      if (isGuest && draftId === 'local') {
        localStorage.removeItem('quizDraft')
        setDrafts([])
        success('Draft deleted')
        return
      }
      await deleteDraft(currentUser.uid, draftId)
      setDrafts(prev => prev.filter(d => d.id !== draftId))
      success('Draft deleted')
    } catch (e) {
      console.error(e)
      error('Failed to delete draft')
    }
  }

  const handleLaunchFromPrevious = async (q) => {
    try {
      // Validate quiz data
      if (!q.title?.trim() || !Array.isArray(q.questions) || q.questions.length === 0) {
        error('Quiz is incomplete. Cannot launch.')
        return
      }

      // Validate questions
      const invalidQuestions = q.questions.filter(item => 
        !item.text?.trim() || 
        (item.type === 'mcq' && (!item.options || item.options.length < 2 || item.options.some(opt => !opt?.trim())))
      )
      
      if (invalidQuestions.length > 0) {
        error('Some questions in this quiz are incomplete. Please edit first.')
        return
      }

      const quizData = {
        title: q.title || 'Untitled Quiz',
        description: q.description || '',
        showAnswers: q.showAnswers || 'live',
        enableRating: !!q.enableRating,
        questionTime: Number(q.questionTime) || 30,
        questions: (q.questions || []).map(item => ({
          text: item.text,
          type: item.type,
          options: item.type === 'mcq' ? (item.options || []) : (item.type === 'boolean' ? ['True', 'False'] : []),
          correctAnswer: item.correctAnswer
        })),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || `guest_${Date.now()}`,
        status: 'waiting',
        currentQuestion: 0,
        showResults: false,
        showLeaderboard: false
      }
      const newId = await createQuiz(quizData)
      success('Quiz duplicated and ready!')

      const hostId = currentUser?.uid || `guest_${Date.now()}`
      localStorage.setItem('userId', hostId)
      localStorage.setItem('isQuizHost', newId)

      try {
        sessionStorage.setItem('launchedDraftMeta', JSON.stringify({
          title: quizData.title,
          questionTime: quizData.questionTime,
          questionsLength: quizData.questions.length
        }))
      } catch {}

      const code = newId.slice(-6).toUpperCase()
      navigate(`/create?launchedId=${newId}&code=${code}`)
    } catch (e) {
      console.error(e)
      error('Failed to launch previous quiz')
    }
  }

  const handleEditFromPrevious = async (q) => {
    try {
      const draftPayload = {
        formData: {
          title: q.title || 'Untitled Quiz',
          description: q.description || '',
          showAnswers: q.showAnswers || 'live',
          enableRating: !!q.enableRating,
          questionTime: Number(q.questionTime) || 30
        },
        questions: (q.questions || []).map(item => ({
          id: Date.now() + Math.random(),
          text: item.text,
          type: item.type,
          options: item.type === 'mcq' ? (item.options || []) : (item.type === 'boolean' ? ['True', 'False'] : ['', '', '', '']),
          correctAnswer: item.correctAnswer
        })),
        timestamp: Date.now()
      }

      if (!currentUser || currentUser.isGuest) {
        // Guests: save locally and go to editor
        localStorage.setItem('quizDraft', JSON.stringify(draftPayload))
        success('Loaded quiz into editor')
        navigate('/create')
      } else {
        // Signed-in: create remote draft and open in editor
        const id = await saveDraftRemote(currentUser.uid, draftPayload)
        success('Loaded quiz into editor')
        navigate(`/create?draftId=${id}`)
      }
    } catch (e) {
      console.error(e)
      error('Failed to open quiz for editing')
    }
  }

  const handleShare = async (quiz, type = 'draft') => {
    try {
      if (isGuest) {
        error('Please sign in to share quizzes')
        return
      }

      setSharingStates(prev => ({ ...prev, [quiz.id]: 'generating' }))
      
      // Validate quiz data before sharing
      let questions = []
      let title = ''
      let description = ''
      let questionTime = 30
      let showAnswers = 'live'
      let enableRating = false

      if (type === 'draft') {
        // Draft structure: quiz.formData and quiz.questions
        title = quiz.formData?.title || 'Untitled Quiz'
        description = quiz.formData?.description || ''
        questions = quiz.questions || []
        questionTime = quiz.formData?.questionTime || 30
        showAnswers = quiz.formData?.showAnswers || 'live'
        enableRating = quiz.formData?.enableRating || false
      } else {
        // Completed quiz structure: direct properties
        title = quiz.title || 'Untitled Quiz'
        description = quiz.description || ''
        questions = quiz.questions || []
        questionTime = quiz.questionTime || 30
        showAnswers = quiz.showAnswers || 'live'
        enableRating = quiz.enableRating || false
      }

      // Debug: Log the extracted data
      console.log('🔍 Extracted quiz data for sharing:')
      console.log('📝 Title:', title)
      console.log('📊 Questions:', questions)
      console.log('🔢 Questions count:', questions.length)
      console.log('⚙️ Type:', type)
      
      // Validate that we have questions
      if (!questions.length) {
        console.log('❌ No questions found, cannot share')
        error('Cannot share quiz: No questions found')
        setSharingStates(prev => ({ ...prev, [quiz.id]: 'error' }))
        setTimeout(() => {
          setSharingStates(prev => ({ ...prev, [quiz.id]: null }))
        }, 2000)
        return
      }

      const shareId = `${type}_${quiz.id}_${Date.now()}`
      const shareData = {
        id: quiz.id,
        title: title,
        description: description,
        questions: questions,
        questionTime: questionTime,
        showAnswers: showAnswers,
        enableRating: enableRating,
        type: type,
        sharedAt: Date.now(),
        sharedBy: currentUser.uid
      }
      
      // Store in localStorage with shareId as key
      console.log('💾 Storing shared data with key:', `shared_${shareId}`)
      console.log('📦 Share data being stored:', shareData)
      localStorage.setItem(`shared_${shareId}`, JSON.stringify(shareData))
      
      // Also store in Firebase for better reliability and cross-device access
      try {
        console.log('🔄 Also storing in Firebase for fallback...')
        // Create a custom Firebase document with our shareId to ensure consistency
        const { doc, setDoc } = await import('firebase/firestore')
        const { db } = await import('../firebase/config')
        
        const firebaseShareData = {
          shareId,
          quizId: quiz.id,
          ownerId: currentUser.uid,
          type,
          createdAt: new Date(),
          accessCount: 0,
          isActive: true,
          // Store the actual quiz data for direct access
          quizData: shareData
        }
        
        await setDoc(doc(db, 'quiz_shares', shareId), firebaseShareData)
        console.log('✅ Firebase backup created successfully with shareId:', shareId)
      } catch (firebaseError) {
        console.warn('⚠️ Firebase backup failed, but localStorage succeeded:', firebaseError.message)
        // Don't fail the whole process if Firebase fails, localStorage is primary
      }
      
      const shareUrl = `${window.location.origin}/shared/${shareId}`
      await navigator.clipboard.writeText(shareUrl)
      setSharingStates(prev => ({ ...prev, [quiz.id]: 'copied' }))
      success('Share link copied to clipboard!')
      
      // Reset state after 2 seconds
      setTimeout(() => {
        setSharingStates(prev => ({ ...prev, [quiz.id]: null }))
      }, 2000)
    } catch (err) {
      console.error('Failed to share quiz:', err)
      error('Failed to generate share link')
      setSharingStates(prev => ({ ...prev, [quiz.id]: 'error' }))
      
      setTimeout(() => {
        setSharingStates(prev => ({ ...prev, [quiz.id]: null }))
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="btn btn-primary px-5 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-full max-w-md">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab==='drafts' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Draft Quizzes
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab==='previous' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Previous Quizzes
          </button>
        </div>

        {activeTab === 'drafts' ? (
          loadingDrafts ? (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading drafts...
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No drafts yet</h3>
              <p className="text-gray-500 mt-1">Save a draft from the Create Quiz page to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {drafts.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div>
                    <div className="font-semibold text-gray-900">{d.formData?.title || 'Untitled Quiz'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Draft</span>
                      <span>
                        {Array.isArray(d.questions) ? d.questions.length : 0} questions
                      </span>
                      {/* Show completion status */}
                      {(() => {
                        const questionCount = Array.isArray(d.questions) ? d.questions.length : 0
                        const hasTitle = d.formData?.title?.trim()
                        const hasValidQuestions = d.questions?.some(q => q.text?.trim())
                        
                        if (!hasTitle || questionCount === 0 || !hasValidQuestions) {
                          return <span className="text-red-500 text-xs">• Incomplete</span>
                        }
                        return <span className="text-green-500 text-xs">• Ready</span>
                      })()}
                      <span>
                        • Updated {d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleString() : 'recently'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(d.id)}
                      className="btn btn-outline px-4 py-2 rounded-xl"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleLaunch(d)}
                      disabled={!isDraftReady(d)}
                      className={`px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition-all ${
                        isDraftReady(d) 
                          ? 'btn btn-primary' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                      }`}
                      title={!isDraftReady(d) ? 'Complete the quiz before launching' : 'Launch quiz'}
                    >
                      <Play className="w-4 h-4" />
                      <span>Launch</span>
                    </button>
                    {!isGuest && (
                      <button
                        onClick={() => handleShare(d, 'draft')}
                        disabled={sharingStates[d.id] === 'generating'}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 transition-all ${
                          sharingStates[d.id] === 'copied'
                            ? 'border-green-200 bg-green-50 text-green-600'
                            : sharingStates[d.id] === 'error'
                            ? 'border-red-200 bg-red-50 text-red-600'
                            : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {sharingStates[d.id] === 'generating' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sharingStates[d.id] === 'copied' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span>
                          {sharingStates[d.id] === 'generating'
                            ? 'Sharing...'
                            : sharingStates[d.id] === 'copied'
                            ? 'Copied!'
                            : sharingStates[d.id] === 'error'
                            ? 'Error'
                            : 'Share'}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          loadingPrevious ? (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading previous quizzes...
            </div>
          ) : (!currentUser || currentUser.isGuest) ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Sign in to see your previous quizzes</h3>
              <p className="text-gray-500 mt-1">Previous quizzes are linked to your account.</p>
            </div>
          ) : previous.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No previous quizzes</h3>
              <p className="text-gray-500 mt-1">Launch a quiz to see it here for quick reuse later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {previous.map((q) => (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div>
                    <div className="font-semibold text-gray-900">{q.title || 'Untitled Quiz'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <span>{(q.questions?.length || 0)} questions</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>
                      {/* Show data quality status */}
                      {(() => {
                        const hasValidQuestions = q.questions?.some(item => item.text?.trim())
                        const hasTitle = q.title?.trim()
                        
                        if (!hasTitle || !hasValidQuestions) {
                          return <span className="text-orange-500 text-xs">• Needs Review</span>
                        }
                        return <span className="text-green-500 text-xs">• Ready</span>
                      })()}
                      <span>• {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString() : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLaunchFromPrevious(q)}
                      disabled={!isQuizReady(q)}
                      className={`px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition-all ${
                        isQuizReady(q) 
                          ? 'btn btn-primary' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                      }`}
                      title={!isQuizReady(q) ? 'Quiz needs review before launching' : 'Launch quiz again'}
                    >
                      <Play className="w-4 h-4" />
                      <span>Launch Again</span>
                    </button>
                    <button
                      onClick={() => handleEditFromPrevious(q)}
                      className="btn btn-outline px-4 py-2 rounded-xl"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    {!isGuest && (
                      <button
                        onClick={() => handleShare(q, 'completed')}
                        disabled={sharingStates[q.id] === 'generating'}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 transition-all ${
                          sharingStates[q.id] === 'copied'
                            ? 'border-green-200 bg-green-50 text-green-600'
                            : sharingStates[q.id] === 'error'
                            ? 'border-red-200 bg-red-50 text-red-600'
                            : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {sharingStates[q.id] === 'generating' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sharingStates[q.id] === 'copied' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span>
                          {sharingStates[q.id] === 'generating'
                            ? 'Sharing...'
                            : sharingStates[q.id] === 'copied'
                            ? 'Copied!'
                            : sharingStates[q.id] === 'error'
                            ? 'Error'
                            : 'Share'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default MyQuizzes
