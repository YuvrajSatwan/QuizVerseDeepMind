import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuiz } from '../contexts/QuizContext'
import { useToast } from '../contexts/ToastContext'

const DEMO_SESSION = {
  sessionId: 'demo-123',
  questions: [
    {
      qId: 'q1',
      text: 'Which traversal visits left-root-right?',
      type: 'MCQ',
      options: ['Preorder', 'Inorder', 'Postorder', 'Levelorder'],
      correctOptionIndex: 1,
      concepts: ['tree traversal'],
      source: 'generated',
      confidence: 0.91
    },
    {
      qId: 'q2',
      text: 'What is the time complexity of BST search in average case?',
      type: 'SHORT',
      concepts: ['BST complexity'],
      source: 'bank',
      confidence: 0.86
    }
  ],
  meta: { estimatedTime: 5 }
}

const START_SESSION_URL = import.meta.env.VITE_START_SESSION_URL
const SUBMIT_ANSWER_URL = import.meta.env.VITE_SUBMIT_ANSWER_URL
const END_SESSION_URL = import.meta.env.VITE_END_SESSION_URL

export function usePracticeSession() {
  const { currentUser } = useAuth()
  const { setPracticeSessionId, setPracticeQuestions, setPracticeGradingLogs } = useQuiz()
  const { success, error: showError, info } = useToast()

  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [gradingLogs, setGradingLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingStart, setLoadingStart] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState(null)

  const isDemoMode = !START_SESSION_URL

  const startSession = useCallback(async (config) => {
    const userId = currentUser?.uid || `guest_${Date.now()}`

    setLoadingStart(true)
    setError(null)

    try {
      let data

      if (isDemoMode) {
        data = DEMO_SESSION
        info('Demo mode: using a sample AI practice session.')
      } else {
        const res = await fetch(START_SESSION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...config,
            userId,
            mode: config.mode || 'practice'
          })
        })

        if (!res.ok) {
          throw new Error('Failed to start AI practice session')
        }

        data = await res.json()
      }

      const sessionIdValue = data.sessionId || 'demo-123'
      const questionsValue = data.questions || []

      setSessionId(sessionIdValue)
      setQuestions(questionsValue)
      setCurrentIndex(0)
      setGradingLogs([])
      setSummary(null)

      // sync to QuizContext
      setPracticeSessionId(sessionIdValue)
      setPracticeQuestions(questionsValue)
      setPracticeGradingLogs([])

      success(
        `Session ready — ${questionsValue.length || config.count || ''} questions generated — starting now.`,
      )

      return { sessionId: sessionIdValue, questions: questionsValue }
    } catch (err) {
      console.error('startSession error:', err)
      setError(err.message)

      if (!isDemoMode) {
        // fallback to demo
        info('Falling back to demo AI practice session.')
        const data = DEMO_SESSION
        const sessionIdValue = data.sessionId
        const questionsValue = data.questions

        setSessionId(sessionIdValue)
        setQuestions(questionsValue)
        setCurrentIndex(0)
        setGradingLogs([])
        setSummary(null)
        setPracticeSessionId(sessionIdValue)
        setPracticeQuestions(questionsValue)
        setPracticeGradingLogs([])

        return { sessionId: sessionIdValue, questions: questionsValue }
      }

      showError(err.message || 'Unable to start practice session.')
      return null
    } finally {
      setLoadingStart(false)
    }
  }, [currentUser, isDemoMode, setPracticeSessionId, setPracticeQuestions, setPracticeGradingLogs, success, showError, info])

  const submitAnswer = useCallback(async ({
    quizId = null,
    answerText,
    answerMeta = {},
  }) => {
    const question = questions[currentIndex]
    if (!question) return null

    const baseLog = {
      questionId: question.qId,
      answerText,
      answerMeta,
      createdAt: Date.now()
    }

    // optimistic local log
    setGradingLogs(prev => [...prev, { ...baseLog, status: 'pending' }])
    setPracticeGradingLogs(prev => [...prev, { ...baseLog, status: 'pending' }])
    setLoadingSubmit(true)

    try {
      let data

      if (!SUBMIT_ANSWER_URL) {
        // simple local grading for demo
        const isCorrect = typeof question.correctOptionIndex === 'number'
          ? question.options?.[question.correctOptionIndex]?.toLowerCase() === answerText?.trim().toLowerCase()
          : false

        data = {
          isCorrect,
          score: isCorrect ? 1 : 0.5,
          feedback: isCorrect
            ? 'Nice work! Your reasoning matches the key idea.'
            : 'You are close — revisit the core concept and try again.',
          mistakeType: isCorrect ? null : 'partial_omission',
          conceptsInvolved: question.concepts || [],
          confidence: 0.8,
          explanation: {
            steps: [
              'Recall the formal definition from your notes.',
              'Try to construct a small example by hand.',
              'Compare your answer to the example behaviour.'
            ],
            tip: 'Focus on the sequence in which the structure is visited.'
          }
        }
      } else {
        const res = await fetch(SUBMIT_ANSWER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            sessionId,
            questionId: question.qId,
            playerId: currentUser?.uid || `guest_${Date.now()}`,
            answerText,
            answerMeta
          })
        })

        if (!res.ok) {
          throw new Error('Failed to submit answer')
        }

        data = await res.json()
      }

      const logWithResult = {
        ...baseLog,
        status: 'graded',
        result: data
      }
      setGradingLogs(prev => [...prev, logWithResult])
      setPracticeGradingLogs(prev => [...prev, logWithResult])

      // advance to next question when graded
      setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))

      return data
    } catch (err) {
      console.error('submitAnswer error:', err)
      setError(err.message)
      showError(err.message || 'Unable to submit answer.')
      const failedLog = { ...baseLog, status: 'failed' }
      setGradingLogs(prev => [...prev, failedLog])
      setPracticeGradingLogs(prev => [...prev, failedLog])
      return null
    } finally {
      setLoadingSubmit(false)
    }
  }, [SUBMIT_ANSWER_URL, questions, currentIndex, sessionId, currentUser, setPracticeGradingLogs, showError])

  const endSession = useCallback(async ({ quizId = null } = {}) => {
    if (!sessionId) return null

    setLoadingSummary(true)
    setError(null)

    try {
      let data

      if (!END_SESSION_URL) {
        // simple client-only summary for demo mode
        const concepts = {}
        questions.forEach(q => {
          (q.concepts || []).forEach(c => {
            concepts[c] = concepts[c] || 0.6
          })
        })

        const gradedLogs = gradingLogs.filter(log => log.status === 'graded')
        const correctCount = gradedLogs.filter(log => log.result?.isCorrect).length
        const incorrectCount = gradedLogs.filter(log => log.result && !log.result?.isCorrect).length
        const totalQuestions = questions.length
        const totalScore = gradedLogs.reduce((sum, log) => sum + (Number(log.result?.score) || 0), 0)

        data = {
          masteryMap: concepts,
          nextBoosters: Object.keys(concepts).slice(0, 1).map(topic => ({
            topic,
            count: 5,
            difficulty: 'easy',
            reason: 'low mastery'
          })),
          timePerConcept: concepts,
          correctCount,
          incorrectCount,
          unanswered: Math.max(0, totalQuestions - gradedLogs.length),
          totalQuestions,
          accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
          score: totalScore
        }
      } else {
        const res = await fetch(END_SESSION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            sessionId,
            playerId: currentUser?.uid || `guest_${Date.now()}`
          })
        })

        if (!res.ok) {
          throw new Error('Failed to end session')
        }

        data = await res.json()
      }

      setSummary(data)
      success('Session wrapped — mastery map ready.')
      return data
    } catch (err) {
      console.error('endSession error:', err)
      setError(err.message)
      showError(err.message || 'Unable to fetch session summary.')
      return null
    } finally {
      setLoadingSummary(false)
    }
  }, [END_SESSION_URL, sessionId, questions, currentUser, success, showError])

  return {
    // data
    sessionId,
    questions,
    currentIndex,
    gradingLogs,
    summary,

    // state
    loadingStart,
    loadingSubmit,
    loadingSummary,
    error,
    isDemoMode,

    // actions
    startSession,
    submitAnswer,
    endSession,
    setCurrentIndex
  }
}
