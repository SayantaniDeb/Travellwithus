import React, { useEffect, useState } from 'react';
import { auth, provider } from '../Firebase';
import { signInWithPopup } from 'firebase/auth';
import logo1 from '../img/54.jpg';
import logo2 from '../img/61.gif'
import { Button } from '@material-tailwind/react';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate();

  const handleClick = () => {
    setLoading(true)
    signInWithPopup(auth, provider)
      .then((data) => {
        setValue(data.user.email)
        localStorage.setItem("email", data.user.email)
        navigate('/home')
      })
      .catch((error) => {
        console.error('Login error:', error)
        setLoading(false)
      })
  }

  useEffect(() => {
    const email = localStorage.getItem('email')
    if (email) {
      setValue(email)
      navigate('/home')
    }
  }, [navigate])

  return (
    <div className="relative min-h-screen bg-gray-100 overflow-hidden">
      {/* Login Card */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-[90%] max-w-xs sm:max-w-sm md:max-w-md mx-auto px-4">
        <div className="bg-white backdrop-blur-sm shadow-2xl rounded-2xl px-6 py-8 sm:px-8 sm:py-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4 sm:mb-6">
              Travel With Us
            </h1>
            <img 
              src={logo2} 
              alt="logo" 
              className="w-20 sm:w-24 md:w-32 mx-auto mb-4 sm:mb-6 rounded-full" 
            />
            <p className="text-gray-600 text-sm sm:text-base mb-6">
              Plan your perfect journey
            </p>
          </div>
          <Button
            color="blue"
            ripple={true}
            className="w-full py-3 sm:py-4 text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </div>
      </div>

      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={logo1}
          alt="background"
          className='w-full h-full object-cover'
        />
        {/* Overlay for better text visibility */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
    </div>
  );
}

export default LoginForm;
