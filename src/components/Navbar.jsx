import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Menu, 
  X, 
  LogOut,
  FileText
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import AuthenticationModal from './AuthenticationModal'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { currentUser, signOut } = useAuth()
  const { success } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const mobileMenuRef = useRef(null)
  const profileMenuRef = useRef(null)

  const handleSignOut = async () => {
    try {
      await signOut()
      success('Signed out successfully')
      setIsProfileOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    if (isMenuOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen, isProfileOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  // Navigation items (mobile)
  const navItems = [{ name: 'My Quizzes', path: '/my-quizzes', icon: FileText }]

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="shadow-lg rounded-2xl"
            >
              <Logo size={36} />
            </motion.div>
            <span className="text-xl font-bold text-gradient">Quizzer</span>
          </Link>

          {/* Desktop Navigation - removed Create/Join; My Quizzes moved to right */}
          <div className="hidden md:flex items-center space-x-8" />

          {/* Right section: My Quizzes button + User menu */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <Link
                to="/my-quizzes"
                className="hidden md:inline-flex items-center gap-2 btn btn-primary px-4 py-2 rounded-xl"
              >
                <FileText className="h-4 w-4" />
                <span>My Quizzes</span>
              </Link>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden md:inline-flex items-center gap-2 btn btn-primary px-4 py-2 rounded-xl"
              >
                <FileText className="h-4 w-4" />
                <span>My Quizzes</span>
              </button>
            )}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-200 min-h-[44px] min-w-[44px]"
                  aria-label="User menu"
                >
                  <User className="h-4 w-4 sm:h-4 sm:w-4" />
                  <span className="hidden sm:block text-sm font-medium">
                    {currentUser.displayName || 'User'}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {currentUser.displayName || 'Guest User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {currentUser.email || 'Guest Account'}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Mobile menu button - Enhanced touch target */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-3 rounded-xl text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-gray-200/50 py-4 px-2 bg-white/95 backdrop-blur-sm"
            >
              <div className="flex flex-col space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: navItems.indexOf(item) * 0.1 }}
                    >
                      {currentUser ? (
                        <Link
                          to={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-4 mx-2 rounded-2xl btn btn-primary"
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => { setShowAuthModal(true); setIsMenuOpen(false) }}
                          className="flex items-center space-x-3 px-4 py-4 mx-2 rounded-2xl btn btn-primary"
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </button>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Mobile user menu when signed in */}
                {currentUser && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: navItems.length * 0.1 }}
                    className="border-t border-gray-200/50 mt-3 pt-3"
                  >
                    <div className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {currentUser.email || 'Guest Account'}
                      </p>
                      <button
                        onClick={() => {
                          handleSignOut()
                          setIsMenuOpen(false)
                        }}
                        className="flex items-center space-x-2 px-4 py-3 mx-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200 min-h-[44px] text-sm font-medium"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
    {/* Authentication Modal (outside nav to avoid clipping) */}
    <AnimatePresence>
      {showAuthModal && (
        <AuthenticationModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false)
            navigate('/my-quizzes')
          }}
        />
      )}
    </AnimatePresence>
  </>
  )
}

export default Navbar

