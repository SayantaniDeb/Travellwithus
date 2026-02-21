
import Lottie from 'react-lottie'
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Firebase';

import CardList from './Cardlist';
import Navbar from './Navbar';
import { 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  CloudIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  HeartIcon,
  SparklesIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';


function SearchBar({ isStandalone = false }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      localStorage.setItem('travelDestination', query.trim());
      navigate(`/plan-trip?destination=${encodeURIComponent(query.trim())}`);
    }
  };

  if (isStandalone) {
    // Standalone version for logged-out users (not overlaid on animation)
    return (
      <div className="bg-gradient-to-b from-gray-50 to-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-serif mb-4">
              Start Planning Your Trip
            </h2>
            <p className="text-gray-600 mb-8">
              Enter your destination and let AI create the perfect itinerary for you
            </p>
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="block w-full p-4 pl-12 pr-32 text-base text-gray-900 border border-gray-200 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-lg" 
                  placeholder="Where do you wanna go?" 
                  required
                />
                <button 
                  type="submit" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black hover:bg-zinc-800 text-white font-medium rounded-xl text-sm px-5 py-2.5 transition-colors shadow-md"
                >
                  Plan Trip ✨
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Powered by AI • Get personalized travel recommendations
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Original overlay version for logged-in users
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
            placeholder="Where do you wanna go?" 
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

function FeaturesSection({ showCTA = true }) {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <SparklesIcon className="w-4 h-4" />
            <span>All-in-One Travel Companion</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 font-serif mb-6">
            Everything You Need to Travel
          </h2>
          
          {/* CTA Card - above subtitle when not logged in */}
          {showCTA && (
            <div className="mb-6">
              <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">Ready to explore?</p>
                    <p className="text-gray-400 text-sm">Sign in to start planning your next adventure</p>
                  </div>
                </div>
                <a 
                  href="/login" 
                  className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Get Started Free →
                </a>
              </div>
            </div>
          )}
          
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {showCTA 
              ? "Sign in to unlock powerful features that make trip planning effortless and enjoyable"
              : "Powerful features that make trip planning effortless and enjoyable"
            }
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {/* Feature 1 - AI Trip Planner */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <MagnifyingGlassIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">AI Trip Planner</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Get personalized day-by-day itineraries powered by AI for any destination</p>
          </div>

          {/* Feature 2 - Save Trips */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Save Your Trips</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Store all your travel plans in one place and access them anytime</p>
          </div>

          {/* Feature 3 - Community */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <ChatBubbleLeftRightIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Travel Community</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Share experiences and get tips from fellow travelers worldwide</p>
          </div>

          {/* Feature 4 - Budget Tracker */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-yellow-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Budget Tracker</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Track expenses and manage your travel budget effortlessly</p>
          </div>

          {/* Feature 5 - Weather */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-cyan-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <CloudIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Weather Updates</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Check real-time weather for your destination before you travel</p>
          </div>

          {/* Feature 6 - Todo List */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-pink-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <ClipboardDocumentListIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Packing List</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Create and manage your travel checklists and to-dos</p>
          </div>

          {/* Feature 7 - Hotels */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Hotel Search</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Find and compare hotels that fit your budget and preferences</p>
          </div>

          {/* Feature 8 - Shortlist */}
          <div className="group bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200 hover:-translate-y-1">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform">
              <HeartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2">Favorites</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">Save your favorite hotels and places for quick access later</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection({ animationData, loading, showTitle = true }) {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  return (
    <div className='relative flex-1 flex items-center justify-center sm:block'>
      {/* Mobile Title - Positioned on top of Lottie (only when showTitle is true) */}
      {showTitle && (
        <h1 className="sm:hidden absolute top-20 left-0 right-0 z-10 text-center font-serif text-3xl font-bold text-gray-900">
          Travel With Us
        </h1>
      )}

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
  );
}

function Section() {
  const [animationData, setAnimationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // LOGGED IN: Show search/animation first, then features without CTA
  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <HeroSection animationData={animationData} loading={loading} />
        <FeaturesSection showCTA={false} />
      </div>
    );
  }

  // NOT LOGGED IN: Show features with search bar (no Lottie animation)
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16 sm:pt-20">
        <FeaturesSection showCTA={true} />
        <SearchBar isStandalone={true} />
      </div>
    </div>
  );
}

export default Section