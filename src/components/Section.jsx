
import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from '../firebaseAuth';
import { auth } from '../firebaseAuth';

import Navbar from './Navbar';
import DestinationAutocomplete from './DestinationAutocomplete';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';


const TravelHeroBackground = lazy(() => import('./demos/LegacyCarHero'));
import FeatureOverview from './FeatureOverview';

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
      <div className="welcome-planning-section py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-serif mb-4">
              Start Planning Your Trip
            </h2>
            <p className="text-gray-600 mb-8">
              Enter your destination and let AI create the perfect itinerary for you
            </p>
            <form id="destination-search" onSubmit={handleSubmit} className="max-w-xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <DestinationAutocomplete
                  type="text" 
                  value={query}
                  onChange={setQuery}
                  className="block w-full p-4 pl-12 pr-32 text-base text-gray-900 border border-gray-200 rounded-2xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-lg" 
                  placeholder="Where do you wanna go?" 
                  required
                />
                <button 
                  type="submit" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 plan-trip-button focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 text-white font-medium rounded-xl text-sm px-5 py-2.5 transition-colors shadow-md"
                >
                  Plan Trip
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
    <div className="container mx-auto px-4 absolute z-20 inset-0 flex items-center justify-center sm:block sm:top-5 sm:left-0 sm:right-0 sm:pt-28 md:pt-32 lg:pt-20">
      <form id="destination-search" onSubmit={handleSubmit} className="px-4 w-full sm:mt-8 md:mt-10 lg:mt-48 max-w-xl mx-auto lg:max-w-2xl">  
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
          <DestinationAutocomplete
            type="text" 
            id="default-search" 
            value={query}
            onChange={setQuery}
            className="block w-full p-3 sm:p-4 pl-9 sm:pl-10 pr-28 sm:pr-32 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-zinc-500 focus:border-zinc-500 focus:outline-none shadow-lg" 
            placeholder="Where do you wanna go?" 
            required
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 plan-trip-button focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 text-white font-medium rounded-lg text-xs sm:text-sm px-4 py-2.5 sm:px-5 sm:py-2.5 transition-colors shadow-md"
          >
            Plan Trip
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
          Powered by AI • Get personalized travel recommendations
        </p>
      </form>
    </div>
  )
}

function PlanningHero() {
  return <section className="welcome-hero relative isolate overflow-hidden"><Suspense fallback={null}><TravelHeroBackground /></Suspense><div className="relative z-10"><SearchBar isStandalone /></div></section>;
}

function Section() {
  const [user, setUser] = useState(null);
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

    });
    return () => unsubscribe();
  }, []);

  // LOGGED IN: Show search/animation first, then features without CTA
  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="pt-14 sm:pt-16"><PlanningHero /></div>
        <FeatureOverview signedIn />
      </div>
    );
  }

  // NOT LOGGED IN: Show features with search bar (no Lottie animation)
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-14 sm:pt-16">
        <PlanningHero />
        <FeatureOverview signedIn={false} />
      </div>
    </div>
  );
}

export default Section
