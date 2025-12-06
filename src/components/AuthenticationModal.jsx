import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const AuthenticationModal = ({ onClose, onSuccess }) => {
  const [authMode, setAuthMode] = useState('signin') // 'signin', 'signup', 'forgot', 'verify'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  
  // Validation errors
  const [errors, setErrors] = useState({})
  
  const {
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInAsGuest,
    resetPassword,
    resendEmailVerification,
    refreshUser,
    authLoading,
    emailVerificationSent,
    currentUser
  } = useAuth()
  
  const { success, error } = useToast()

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    return password.length >= 6
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (authMode === 'signup') {
      if (!formData.displayName.trim()) {
        newErrors.displayName = 'Display name is required'
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      if (authMode === 'signin') {
        await signInWithEmail(formData.email, formData.password)
        success('Signed in successfully!')
        onSuccess?.()
      } else if (authMode === 'signup') {
        const user = await signUpWithEmail(formData.email, formData.password, formData.displayName)
        success('Account created! Please check your email to verify your account.')
        setAuthMode('verify')
      } else if (authMode === 'forgot') {
        await resetPassword(formData.email)
        success('Password reset email sent! Check your inbox.')
        setAuthMode('signin')
      }
    } catch (err) {
      console.error('Authentication error:', err)
      
      // Handle specific Firebase errors
      const errorCode = err.code || ''
      const errorMessage = err.message || 'An error occurred'
      
      if (errorCode === 'auth/operation-not-allowed') {
        error('Email/password authentication is not enabled. Please contact support or try Google sign-in.')
      } else if (errorCode === 'auth/user-not-found') {
        error('No account found with this email address.')
      } else if (errorCode === 'auth/wrong-password') {
        error('Incorrect password. Please try again.')
      } else if (errorCode === 'auth/email-already-in-use') {
        error('An account with this email already exists.')
      } else if (errorCode === 'auth/weak-password') {
        error('Password is too weak. Please choose a stronger password.')
      } else if (errorCode === 'auth/too-many-requests') {
        error('Too many failed attempts. Please try again later.')
      } else if (errorCode === 'auth/network-request-failed') {
        error('Network error. Please check your internet connection.')
      } else if (errorMessage.includes('user-not-found')) {
        error('No account found with this email address.')
      } else if (errorMessage.includes('wrong-password')) {
        error('Incorrect password. Please try again.')
      } else if (errorMessage.includes('email-already-in-use')) {
        error('An account with this email already exists.')
      } else if (errorMessage.includes('weak-password')) {
        error('Password is too weak. Please choose a stronger password.')
      } else if (errorMessage.includes('too-many-requests')) {
        error('Too many failed attempts. Please try again later.')
      } else {
        error(errorMessage)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      success('Signed in with Google successfully!')
      onSuccess?.()
    } catch (err) {
      console.error('Google sign-in error:', err)
      
      const errorCode = err.code || ''
      
      if (errorCode === 'auth/popup-closed-by-user') {
        error('Sign-in cancelled. Please try again.')
      } else if (errorCode === 'auth/popup-blocked') {
        error('Popup blocked by browser. Please allow popups and try again.')
      } else if (errorCode === 'auth/operation-not-allowed') {
        error('Google sign-in is not enabled. Please try email/password or contact support.')
      } else if (errorCode === 'auth/network-request-failed') {
        error('Network error. Please check your internet connection.')
      } else {
        error('Failed to sign in with Google. Please try again or use email/password.')
      }
    }
  }

  const handleGuestSignIn = () => {
    signInAsGuest()
    success('Continuing as guest!')
    onSuccess?.()
  }

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification()
      success('Verification email sent! Check your inbox.')
    } catch (err) {
      console.error('Resend verification error:', err)
      error('Failed to send verification email. Please try again.')
    }
  }

  const handleRefreshEmailStatus = async () => {
    try {
      const updatedUser = await refreshUser()
      if (updatedUser?.emailVerified) {
        success('Email verified successfully!')
        onSuccess?.()
      } else {
        error('Email not verified yet. Please check your inbox and click the verification link.')
      }
    } catch (err) {
      console.error('Refresh user error:', err)
      error('Failed to check email verification status.')
    }
  }

  // Check if user exists but email is not verified
  const showEmailVerification = currentUser && !currentUser.emailVerified && !currentUser.isGuest && authMode === 'verify'

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 w-full max-w-[92vw] sm:max-w-md lg:max-w-lg relative overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 z-10"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 px-6 sm:px-8 py-5 sm:py-6 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              {showEmailVerification ? (
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : authMode === 'forgot' ? (
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {showEmailVerification ? 'Verify Email' : 
                 authMode === 'signin' ? 'Welcome Back' :
                 authMode === 'signup' ? 'Create Account' :
                 'Reset Password'}
              </h2>
              <p className="text-primary-100 text-sm sm:text-base">
                {showEmailVerification ? 'Check your inbox for verification' :
                 authMode === 'signin' ? 'Sign in to continue' :
                 authMode === 'signup' ? 'Join the quiz community' :
                 'Enter your email to reset'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(92vh-120px)]">
          {/* Email Verification Screen */}
          {showEmailVerification && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 sm:space-y-8"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  We've sent a verification link to{' '}
                  <span className="font-medium text-primary-600">
                    {currentUser?.email}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Click the link in the email to verify your account and start creating quizzes.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={handleRefreshEmailStatus}
                  disabled={authLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-3 sm:py-4 px-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 min-h-[48px] text-sm sm:text-base"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  <span>I've verified my email</span>
                </button>

                <button
                  onClick={handleResendVerification}
                  disabled={authLoading || emailVerificationSent}
                  className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-3 sm:py-4 px-4 rounded-2xl font-medium transition-all duration-200 min-h-[48px] text-sm sm:text-base"
                >
                  {emailVerificationSent ? 'Email Sent!' : 'Resend Email'}
                </button>

                <div className="pt-2">
                  <button
                    onClick={() => setAuthMode('signin')}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium min-h-[44px] px-4 flex items-center justify-center mx-auto"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Auth Forms */}
          {!showEmailVerification && (
            <>
              {/* Social Sign In Options */}
              <div className="space-y-3 sm:space-y-4 mb-6">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 text-gray-700 font-semibold py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 hover:shadow-md min-h-[48px]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm sm:text-base">Continue with Google</span>
                </button>

                <button
                  onClick={handleGuestSignIn}
                  disabled={authLoading}
                  className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 min-h-[48px]"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm sm:text-base">Continue as Guest</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or</span>
                  </div>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Display Name (signup only) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-base ${
                          errors.displayName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
                        }`}
                        placeholder="Your name"
                        required={authMode === 'signup'}
                      />
                    </div>
                    {errors.displayName && (
                      <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.displayName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-base ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
                      }`}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                {authMode !== 'forgot' && (
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-base ${
                          errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
                        }`}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.password}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Confirm Password (signup only) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-base ${
                          errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary-500'
                        }`}
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 text-white py-3 px-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] min-h-[48px] mt-6 sm:mt-8"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === 'signin' ? 'Sign In' :
                         authMode === 'signup' ? 'Create Account' :
                         'Send Reset Email'}
                      </span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Mode Switching Links */}
                <div className="text-center space-y-2">
                  {authMode === 'signin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setErrors({})
                          setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Forgot your password?
                      </button>
                      <div>
                        <span className="text-gray-600 text-sm">Don't have an account? </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('signup')
                            setErrors({})
                            setFormData(prev => ({ ...prev, password: '', confirmPassword: '', displayName: '' }))
                          }}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Sign up here
                        </button>
                      </div>
                    </>
                  )}

                  {authMode === 'signup' && (
                    <div>
                      <span className="text-gray-600 text-sm">Already have an account? </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin')
                          setErrors({})
                          setFormData(prev => ({ ...prev, password: '', confirmPassword: '', displayName: '' }))
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Sign in here
                      </button>
                    </div>
                  )}

                  {authMode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin')
                        setErrors({})
                        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      ← Back to Sign In
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {/* Security Note */}
          {!showEmailVerification && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">Secure Authentication</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {authMode === 'signup' 
                      ? 'Your account will be secured with email verification.'
                      : 'Your data is protected with industry-standard security measures.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default AuthenticationModal