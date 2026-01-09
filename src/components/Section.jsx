
import Lottie from 'react-lottie'
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CardList from './Cardlist';
import Navbar from './Navbar';
import Bottom from './bottomfoot';


function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Save destination to localStorage for Routes page
      localStorage.setItem('travelDestination', query.trim());
      // Navigate to trip planner page with destination as query param
      navigate(`/plan-trip?destination=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="container mx-auto px-4 absolute inset-0 flex items-center justify-center sm:block sm:top-5 sm:left-0 sm:right-0 sm:pt-28 md:pt-32 lg:pt-20">
      <form onSubmit={handleSubmit} className="px-4 w-full sm:mt-8 md:mt-10 lg:mt-48 max-w-xl mx-auto lg:max-w-2xl">  
        <p className='font-serif text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 text-center lg:text-left'>
          Your pocket friend travel kit,<br className="hidden sm:block"/>
          plan your weekend with us!
        </p>   
        <label htmlFor="default-search" className="mb-2 text-sm font-medium text-gray-900 sr-only">
          Search
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg 
              aria-hidden="true" 
              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input 
            type="text" 
            id="default-search" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full p-3 sm:p-4 pl-9 sm:pl-10 pr-28 sm:pr-32 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-zinc-500 focus:border-zinc-500 focus:outline-none shadow-lg" 
            placeholder="Where do you wanna go? (e.g., Paris, Tokyo, Bali...)" 
            required
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg text-xs sm:text-sm px-4 py-2.5 sm:px-5 sm:py-2.5 transition-colors shadow-md"
          >
            Plan Trip ✨
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
          Powered by AI • Get personalized travel recommendations
        </p>
      </form>
    </div>
  )
}

function Section() {
  const [animationData, setAnimationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('https://assets3.lottiefiles.com/packages/lf20_bhebjzpu.json')
      .then((res) => {
        setAnimationData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <Navbar/>
      <div className='relative flex-1 flex items-center justify-center sm:block'>
        {/* Mobile Title - Positioned on top of Lottie */}
        <h1 className="sm:hidden absolute top-20 left-0 right-0 z-10 text-center font-serif text-3xl font-bold text-gray-900">
          Travel With Us
        </h1>

        {/* Buffering spinner while loading animation */}
        {loading ? (
          <div className="w-full h-[calc(100vh-120px)] sm:h-[60vh] md:h-[70vh] lg:h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-120px)] sm:h-[60vh] md:h-[70vh] lg:h-screen">
            <Lottie 
              options={defaultOptions} 
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
        <SearchBar />
      </div>

      {/* Features Section */}
      <CardList />
      <div className="hidden sm:block">
        <Bottom />
      </div>
    </div>
  )
}

export default Section