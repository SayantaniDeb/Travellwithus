import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './Navbar';

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', CHF: 'Fr', SGD: 'S$', AED: 'د.إ', THB: '฿',
  MYR: 'RM', IDR: 'Rp', KRW: '₩', MXN: 'Mex$', BRL: 'R$', ZAR: 'R',
  NZD: 'NZ$', SEK: 'kr', NOK: 'kr', DKK: 'kr', RUB: '₽', TRY: '₺',
  PHP: '₱', VND: '₫', EGP: 'E£', PKR: 'Rs', LKR: 'Rs', NPR: 'Rs', BDT: '৳'
};

export default function BudgetList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch trips with budgets
  useEffect(() => {
    if (!user) return;

    const tripsRef = collection(db, 'users', user.uid, 'trips');
    const q = query(tripsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching trips:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCurrencySymbol = (currency) => {
    return CURRENCY_SYMBOLS[currency] || '$';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Budget Tracker</h1>
            <p className="text-zinc-500 mt-1">Track spending across all your trips</p>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-blue-100 text-xs sm:text-sm">Total Trips</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{trips.length}</p>
              </div>
              <div className="text-center border-x border-white/20">
                <p className="text-blue-100 text-xs sm:text-sm">With Budget</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {trips.filter(t => t.budgetAmount > 0).length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-blue-100 text-xs sm:text-sm">Active</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {trips.filter(t => new Date(t.endDate) >= new Date()).length}
                </p>
              </div>
            </div>
          </div>

          {/* Trips List */}
          {trips.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Trips Yet</h3>
              <p className="text-zinc-500 mb-4">Plan your first trip to start tracking your budget</p>
              <button
                onClick={() => navigate('/home')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                Plan a Trip
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => {
                const symbol = getCurrencySymbol(trip.currency);
                const spent = trip.totalSpent || 0;
                const budget = trip.budgetAmount || 0;
                const percentSpent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const remaining = budget - spent;
                const isPast = new Date(trip.endDate) < new Date();

                return (
                  <div
                    key={trip.id}
                    onClick={() => navigate(`/budget/${trip.id}`)}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-5 cursor-pointer hover:border-zinc-300 hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                            {trip.destination}
                          </h3>
                          {isPast && (
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-xs rounded-full">Past</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                          {trip.source && (
                            <span className="ml-2 text-zinc-400">• from {trip.source}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        {budget > 0 ? (
                          <>
                            <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {symbol}{remaining.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500">remaining</p>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-400">No budget set</p>
                        )}
                      </div>
                    </div>

                    {budget > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-zinc-500">
                            Spent: {symbol}{spent.toLocaleString()}
                          </span>
                          <span className="text-zinc-500">
                            Budget: {symbol}{budget.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentSpent > 90 ? 'bg-red-500' : percentSpent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentSpent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{trip.days?.length || 0} days</span>
                        {trip.travelInfo?.estimatedTicketCost && (
                          <span className="text-xs text-zinc-400">
                            • Travel: {trip.travelInfo.estimatedTicketCost}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-blue-600 group-hover:underline flex items-center gap-1">
                        View Details
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
