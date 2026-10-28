import { LoadingOverlay } from './NavigationLoading';
import LoadingSpinner from './LoadingSpinner';
import BudgetTrackerPreview from './BudgetTrackerPreview';
import { savedTripPath } from '../utils/tripNavigation';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from '../Firebase';
import Navbar from './Navbar';

// Currency data
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  THB: { symbol: '฿', name: 'Thai Baht' },
};

export default function BudgetTracker() {
  // Minimum trip cost (can be dynamic, here set as example)
  const MIN_TRIP_COST = 100; // Change as needed or make dynamic
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetBudget, setShowSetBudget] = useState(false);
  
  const [totalBudget, setTotalBudgetInput] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch trip data
  useEffect(() => {
    if (!user) return;

    // If trip data is passed via navigation state (from trip planner)
    if (location.state?.tripData) {
      const tripData = location.state.tripData;
      setTrip({ ...tripData, id: tripId });
      setTotalBudgetInput(location.state.budgetAmount?.toString() || '');
      setSelectedCurrency(location.state.currency || 'USD');
      setLoading(false);
    }

    // Keep the saved trip authoritative, including when navigation carries a preview.
    if (!tripId) {
      setLoading(false);
      return;
    }

    return onSnapshot(doc(db,'users',user.uid,'trips',tripId),snapshot=>{
      if(snapshot.exists()){
        const data=snapshot.data();setTrip({...data,id:snapshot.id});setTotalBudgetInput(data.budgetAmount?.toString()||'');setSelectedCurrency(data.currency||'INR');
      }else setTrip(null);
      setLoading(false);
    },()=>{setTrip(null);setLoading(false);});
  }, [user, tripId, location.state]);

  const setBudget = async () => {
    const budgetValue = parseFloat(totalBudget);
    if (!totalBudget || budgetValue <= 0) {
      alert('Please enter a valid budget');
      return;
    }
    if (budgetValue < MIN_TRIP_COST) {
      alert('Too less money, earn some');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid, 'trips', tripId), {
        budgetAmount: parseFloat(totalBudget),
        currency: selectedCurrency
      });
      setTrip({ ...trip, budgetAmount: parseFloat(totalBudget), currency: selectedCurrency });
      setShowSetBudget(false);
    } catch (err) {
      console.error('Error setting budget:', err);
      alert('Failed to set budget');
    }
  };

  const currencySymbol = CURRENCIES[trip?.currency]?.symbol || '$';

  if (loading) {
    return (
      <div className="min-h-screen trip-page-background budget-background flex items-center justify-center">
        <LoadingOverlay label="Loading budget…"/>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen trip-page-background budget-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Please Login</h2>
              <p className="text-zinc-500 text-sm mb-6">You need to be logged in to track your budget.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen trip-page-background budget-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Trip Not Found</h2>
              <p className="text-zinc-500 text-sm mb-6">This trip doesn't exist or has been deleted.</p>
              <button
                onClick={() => navigate('/saved-trips')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                View My Trips
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen trip-page-background budget-background">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">{trip.destination}</h1>
              <p className="text-zinc-500 text-sm">Budget Tracker</p>
            </div>
          </div>

          <div className="mb-4 flex justify-end"><button type="button" onClick={()=>setShowSetBudget(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700">Edit total budget</button></div>
          <BudgetTrackerPreview key={trip.id} trip={trip} userId={user.uid} symbol={currencySymbol} standalone readOnlyEstimates />
        </div>
      </div>

      {/* Set Budget Modal */}
      {showSetBudget && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Set Budget</h3>
              <button
                onClick={() => setShowSetBudget(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Currency selection first */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={e => setSelectedCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-center"
                >
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <option key={code} value={code}>{info.symbol} {info.name}</option>
                  ))}
                </select>
              </div>
              {/* Amount input second */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Total Budget ({CURRENCIES[selectedCurrency]?.symbol || '$'})
                </label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  placeholder="Enter your budget"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xl font-semibold placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-center"
                />
                <p className="text-zinc-500 text-xs mt-2 text-center">
                  This is the total amount you plan to spend on this trip
                </p>
              </div>
              <button
                onClick={setBudget}
                className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
