import React, { useEffect, useState } from 'react';
import { auth, provider, appleProvider } from '../Firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import logo1 from '../img/54.jpg';
import { Button } from '@material-tailwind/react';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [useRedirect, setUseRedirect] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const navigate = useNavigate();

  // Check for redirect result on component mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setValue(result.user.email)
          localStorage.setItem("email", result.user.email)
          localStorage.setItem("displayName", result.user.displayName || result.user.email?.split('@')[0] || 'User')
          navigate('/home')
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error)
        if (error.code === 'auth/popup-blocked' || error.message.includes('disallowed_useragent')) {
          setUseRedirect(true)
        }
      })
  }, [navigate])

  const handleClick = () => {
    setLoading(true)
    setError('')
    
    if (useRedirect) {
      // Use redirect method for mobile browsers
      signInWithRedirect(auth, provider)
        .catch((error) => {
          console.error('Redirect sign-in error:', error)
          setLoading(false)
          setError('Failed to start sign-in process. Please try again.')
        })
    } else {
      // Try popup method first
      signInWithPopup(auth, provider)
        .then((data) => {
          setValue(data.user.email)
          localStorage.setItem("email", data.user.email)
          localStorage.setItem("displayName", data.user.displayName || data.user.email?.split('@')[0] || 'User')
          navigate('/home')
        })
        .catch((error) => {
          console.error('Login error:', error)
          setLoading(false)
          
          // Handle specific Firebase Auth errors
          if (error.code === 'auth/popup-blocked') {
            setError('Popup was blocked. Switching to redirect mode - you\'ll be redirected to Google and back.')
            setUseRedirect(true)
          } else if (error.code === 'auth/popup-closed-by-user') {
            setError('Sign-in was cancelled. Please try again.')
          } else if (error.code === 'auth/cancelled-popup-request') {
            setError('Another sign-in request is in progress. Please wait.')
          } else if (error.message.includes('disallowed_useragent')) {
            setError('This browser is not supported for sign-in. Please open this app in a standard web browser like Chrome, Safari, or Firefox.')
            setUseRedirect(true)
          } else {
            setError('Sign-in failed. Please try again or contact support.')
          }
        })
    }
  }

  const handleAppleSignIn = () => {
    setLoading(true)
    setError('')

    signInWithPopup(auth, appleProvider)
      .then((result) => {
        // The signed-in user info
        const user = result.user;
        setValue(user.email)
        localStorage.setItem("email", user.email)
        localStorage.setItem("displayName", user.displayName || user.email?.split('@')[0] || 'User')
        navigate('/home')
      })
      .catch((error) => {
        console.error('Apple sign-in error:', error)
        setLoading(false)

        if (error.code === 'auth/popup-blocked') {
          setError('Popup was blocked. Please allow popups for this site and try again.')
        } else if (error.code === 'auth/popup-closed-by-user') {
          setError('Sign-in was cancelled. Please try again.')
        } else if (error.code === 'auth/cancelled-popup-request') {
          setError('Another sign-in request is in progress. Please wait.')
        } else {
          setError('Apple sign-in failed. Please try again or contact support.')
        }
      })
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailSent(true)
      setError('') // Clear any existing errors
    } catch (error) {
      console.error('Password reset error:', error)
      setLoading(false)

      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many password reset requests. Please try again later.')
      } else {
        setError('Failed to send password reset email. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      try {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        
        // Send email verification
        await sendEmailVerification(result.user)
        
        // Switch to sign-in mode and show verification message
        setIsSignUp(false)
        setShowVerificationMessage(true)
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setLoading(false)
        
      } catch (error) {
        console.error('Sign up error:', error)
        setLoading(false)
        
        if (error.code === 'auth/email-already-in-use') {
          setError('An account with this email already exists. Try signing in instead.')
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.')
        } else if (error.code === 'auth/weak-password') {
          setError('Password is too weak. Please choose a stronger password.')
        } else {
          setError('Sign up failed. Please try again.')
        }
      }
    } else {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password)
        setValue(result.user.email)
        localStorage.setItem("email", result.user.email)
        localStorage.setItem("displayName", result.user.displayName || result.user.email?.split('@')[0] || 'User')
        navigate('/home')
      } catch (error) {
        console.error('Sign in error:', error)
        setLoading(false)
        
        if (error.code === 'auth/user-not-found') {
          setError('No account found with this email. Try signing up instead.')
        } else if (error.code === 'auth/wrong-password') {
          // Check what sign-in methods are available for this email
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email)
            if (methods.includes('google.com')) {
              setError('This email is registered with Google Sign-In. Please use "Sign in with Google" instead.')
            } else if (methods.includes('apple.com')) {
              setError('This email is registered with Apple Sign-In. Please use "Continue with Apple" instead.')
            } else {
              setError('Incorrect password. Please try again or reset your password.')
            }
          } catch (methodError) {
            console.error('Error checking sign-in methods:', methodError)
            setError('Incorrect password. Please try again or reset your password.')
          }
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.')
        } else if (error.code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please try again later.')
        } else if (error.code === 'auth/user-disabled') {
          setError('This account has been disabled. Please contact support.')
        } else {
          setError('Sign in failed. Please try again.')
        }
      }
    }
  }

  // Handle mobile keyboard layout adjustments
  useEffect(() => {
    const handleViewportChange = () => {
      // Force a re-render to update positioning when viewport changes
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport.removeEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
      return () => window.removeEventListener('resize', handleViewportChange);
    }
  }, []);

  return (
    <div className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Login Card */}
      <div className="z-10 w-[95%] max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto px-3 sm:px-4">
        <div className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl sm:rounded-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 border border-white/30">
          <div className="text-center">
            {/* Back Button */}
            <div className="flex justify-start mb-3 sm:mb-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 py-1 px-2 -ml-2 rounded-md hover:bg-gray-100 active:bg-gray-200"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6 leading-tight">
              Travel With Us
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 px-2 sm:px-0">
              Plan your perfect journey
            </p>
            
            {useRedirect && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Redirect Mode Active</p>
                    <p className="mt-1 text-xs sm:text-sm">You'll be redirected to Google for sign-in, then brought back here automatically.</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Sign-in Error</p>
                    <p className="mt-1 text-xs sm:text-sm">{error}</p>
                    {error.includes('browser is not supported') && (
                      <div className="mt-2 sm:mt-3 text-xs">
                        <p className="font-medium mb-1">Try these options:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Open in Chrome, Safari, or Firefox</li>
                          <li>Use the "Open in browser" option</li>
                          <li>Copy the link and paste in a standard browser</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {resetEmailSent && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Password Reset Email Sent</p>
                    <p className="mt-1 text-xs sm:text-sm">Check your email for instructions to reset your password.</p>
                  </div>
                </div>
              </div>
            )}

            {showVerificationMessage && !isSignUp && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 sm:px-4 py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <div>
                    <p className="font-medium text-xs sm:text-sm">Verification Link Sent</p>
                    <p className="mt-1 text-xs sm:text-sm">Please check your email and click the verification link to activate your account, then sign in below.</p>
                  </div>
                </div>
              </div>
            )}            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              <div>
                <div className="flex justify-end mb-1 sm:mb-2">
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors duration-200 disabled:text-gray-400"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  required
                  minLength={6}
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base mt-2"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            
            {/* Toggle between Sign In and Sign Up */}
            <div className="text-center mb-4 sm:mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                  setResetEmailSent(false)
                  setShowVerificationMessage(false)
                }}
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium underline underline-offset-2 transition-colors duration-200"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Button
                color="blue"
                ripple={true}
                className="w-full py-3 sm:py-3.5 text-xs sm:text-sm md:text-base font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleClick}
                disabled={loading}
              >
                {loading ? 'Signing in...' : useRedirect ? 'Continue with Google' : 'Sign in with Google'}
              </Button>

              <Button
                color="gray"
                ripple={true}
                className="w-full py-3 sm:py-3.5 text-xs sm:text-sm md:text-base font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-black hover:bg-gray-800 text-white"
                onClick={handleAppleSignIn}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Continue with Apple'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <img
          src={logo1}
          alt="background"
          className='w-full h-full object-cover object-center'
        />
        {/* Overlay for better text visibility */}
        <div className="absolute inset-0 bg-black/10 sm:bg-black/15"></div>
      </div>
    </div>
  );
}

export default LoginForm;
