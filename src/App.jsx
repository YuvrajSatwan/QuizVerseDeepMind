import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { QuizProvider } from './contexts/QuizContext'
import { ToastProvider } from './contexts/ToastContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CreateQuiz from './pages/CreateQuiz'
import JoinQuiz from './pages/JoinQuiz'
import QuizRoom from './pages/QuizRoom'
import SharedQuiz from './pages/SharedQuiz'
import FirebaseDiagnostic from './components/FirebaseDiagnostic'
import ToastContainer from './components/ToastContainer'
import MyQuizzes from './pages/MyQuizzes'

// Component to handle conditional navbar rendering
function AppContent() {
  const location = useLocation()
  const isQuizRoom = location.pathname.startsWith('/quiz/')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {!isQuizRoom && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateQuiz />} />
        <Route path="/join" element={<JoinQuiz />} />
        <Route path="/quiz/:quizId" element={<QuizRoom />} />
        <Route path="/shared/:shareId" element={<SharedQuiz />} />
        <Route path="/diagnostic" element={<FirebaseDiagnostic />} />
        <Route path="/my-quizzes" element={<MyQuizzes />} />
      </Routes>
      <ToastContainer />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <QuizProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </QuizProvider>
      </AuthProvider>
    </Router>
  )
}

export default App

