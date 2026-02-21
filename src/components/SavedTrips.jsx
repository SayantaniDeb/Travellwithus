import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './Navbar';

// LLM provider configuration
const LLM_PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'groq';
const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to call AI via backend proxy
const callAI = async (model, prompt, maxTokens = 8000) => {
  const response = await fetch(`${API_URL}/api/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a travel planner. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      provider: LLM_PROVIDER
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices?.[0]?.message?.content;
};

// Currency data for display
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
};

export default function SavedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedDay, setEditedDay] = useState(null);
  const [showBudgetEditModal, setShowBudgetEditModal] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

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
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const deleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'trips', tripId));
      setSelectedTrip(null);
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Failed to delete trip');
    }
  };

  const saveEditedDay = async () => {
    if (!selectedTrip || !editedDay) return;

    try {
      const updatedDays = selectedTrip.days.map(d => 
        d.day === editedDay.day ? editedDay : d
      );

      await updateDoc(doc(db, 'users', user.uid, 'trips', selectedTrip.id), {
        days: updatedDays,
        updatedAt: new Date()
      });

      setSelectedTrip({ ...selectedTrip, days: updatedDays });
      setSelectedDay(editedDay);
      setEditMode(false);
      alert('Day updated successfully!');
    } catch (err) {
      console.error('Error updating day:', err);
      alert('Failed to update day');
    }
  };

  // Regenerate plan with new budget
  const regeneratePlanWithBudget = async () => {
    if (!selectedTrip || !newBudget) return;
    
    const budgetNum = parseFloat(newBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    setRegenerating(true);
    
    const currency = selectedTrip.currency || 'INR';
    const currencySymbol = CURRENCIES[currency]?.symbol || '₹';
    const destination = selectedTrip.actualDestination || selectedTrip.destination;
    const source = selectedTrip.source || '';
    const numDays = selectedTrip.days?.length || 3;
    const startDate = selectedTrip.startDate || selectedTrip.days?.[0]?.date;
    const endDate = selectedTrip.endDate || selectedTrip.days?.[numDays - 1]?.date;

    const prompt = `Regenerate a ${numDays}-day travel plan for "${destination}"${source ? ` from ${source}` : ''} with a NEW BUDGET of ${currencySymbol}${budgetNum}.

Previous budget was: ${currencySymbol}${selectedTrip.budgetAmount || 'not specified'}
New budget is: ${currencySymbol}${budgetNum}

Dates: ${startDate} to ${endDate}. Currency: ${currency} (${currencySymbol}).

IMPORTANT: Adjust the plan based on the budget change:
${budgetNum > (selectedTrip.budgetAmount || 0) ? 
  '- Budget INCREASED: Upgrade accommodations, add premium activities, consider better transport options, include nicer restaurants' : 
  '- Budget DECREASED: Use more budget-friendly accommodations, free/cheap activities, public transport, street food options'}

CRITICAL - Use REALISTIC 2024-2026 prices. Consider ACTUAL distance:
${currency === 'INR' ? `
TRANSPORT (based on distance):
- Short distance (<200km): Bus ₹200-₹600, Train ₹150-₹500
- Medium distance (200-500km): Bus ₹600-₹1,200, Train ₹400-₹1,200, Flight ₹2,500-₹5,000
- Long distance (500km+): Bus ₹1,000-₹2,500, Train ₹800-₹2,500, Flight ₹3,500-₹12,000

ACCOMMODATION per night (adjust based on budget):
- Budget hostels/guesthouses: ₹500-₹1,500
- Mid-range hotels: ₹1,500-₹4,000
- Good hotels: ₹4,000-₹8,000
- Luxury/resorts: ₹8,000-₹25,000+

FOOD per day: ₹400-₹1,500 (street food to restaurants)
ACTIVITIES: Entry fees ₹50-₹500, guides ₹500-₹2,000
` : `
Adjust prices appropriately for ${currency} currency.
`}

Return ONLY valid JSON (keep same structure as original):
{
  "destination": "${selectedTrip.destination}",
  "actualDestination": "${destination}",
  "source": "${source}",
  "summary": "Brief trip overview adjusted for new budget",
  "currency": "${currency}",
  "currencySymbol": "${currencySymbol}",
  "budgetAmount": ${budgetNum},
  "travelInfo": {
    "from": "${source}",
    "fromStation": "Departure station/airport",
    "to": "${destination}",
    "toStation": "Arrival station/airport",
    "recommendedMode": "Flight/Train/Bus (choose based on budget)",
    "estimatedTicketCost": "${currencySymbol}XXX",
    "travelDuration": "X hours",
    "tips": "Budget-appropriate travel tip"
  },
  "days": [
    ${Array.from({length: numDays}, (_, i) => `{
      "day": ${i + 1},
      "date": "${selectedTrip.days?.[i]?.date || ''}",
      "title": "Day title",
      "summary": "Day summary adjusted for budget",
      "morning": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h"},
      "afternoon": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "3h"},
      "evening": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h"},
      "meals": {"breakfast": "Budget-appropriate food", "lunch": "Budget-appropriate food", "dinner": "Budget-appropriate food"},
      "tips": ["Tip"]
    }`).join(',\n    ')}
  ],
  "packingList": ["Item1", "Item2"],
  "totalBudget": "${currencySymbol}${budgetNum}"
}`;

    try {
      let text;
      if (LLM_PROVIDER === 'groq') {
        text = await callAI('openai/gpt-oss-20b', prompt, 6000);
      } else {
        text = await callAI('gpt-4o', prompt, 6000);
      }

      if (text) {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        let planData;
        try {
          planData = JSON.parse(cleanText);
        } catch (parseErr) {
          // Try to fix truncated JSON
          let fixedText = cleanText;
          const openBraces = (cleanText.match(/{/g) || []).length;
          const closeBraces = (cleanText.match(/}/g) || []).length;
          const openBrackets = (cleanText.match(/\[/g) || []).length;
          const closeBrackets = (cleanText.match(/\]/g) || []).length;
          
          for (let i = 0; i < openBrackets - closeBrackets; i++) fixedText += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) fixedText += '}';
          
          planData = JSON.parse(fixedText);
        }

        // Update in Firestore
        await updateDoc(doc(db, 'users', user.uid, 'trips', selectedTrip.id), {
          ...planData,
          source: source,
          budgetAmount: budgetNum,
          updatedAt: new Date()
        });

        // Update local state
        setSelectedTrip({
          ...selectedTrip,
          ...planData,
          budgetAmount: budgetNum
        });

        setShowBudgetEditModal(false);
        setNewBudget('');
        alert('Trip updated with new budget! 🎉');
      }
    } catch (err) {
      console.error('Error regenerating plan:', err);
      alert('Failed to regenerate plan. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Please Login</h2>
              <p className="text-zinc-500 text-sm mb-6">You need to be logged in to view your saved trips.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-zinc-900/25"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trip List View
  if (!selectedTrip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-zinc-900">My Saved Trips</h1>
                <p className="text-zinc-500 text-sm mt-0.5">{trips.length} trip{trips.length !== 1 ? 's' : ''} saved</p>
              </div>
              <button
                onClick={() => navigate('/home')}
                className="px-4 py-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-white/80 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                ← Back
              </button>
            </div>

            {trips.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">No trips saved yet</h3>
                <p className="text-zinc-500 text-sm mb-6">Start planning your next adventure!</p>
                <button
                  onClick={() => navigate('/home')}
                  className="px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-zinc-900/25"
                >
                  Plan a Trip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-5 cursor-pointer hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {trip.source && (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            From: {trip.source}
                          </div>
                        )}
                        <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700 flex items-center gap-2">
                          {trip.source && (
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          )}
                          {trip.destination}
                        </h3>
                      </div>
                      <span className="bg-gradient-to-r from-zinc-100 to-zinc-50 text-zinc-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-zinc-200/60">
                        {trip.days?.length || 0} days
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{trip.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                      <span className="text-sm font-semibold">{trip.totalBudget}</span>
                    </div>
                    {trip.currency && (
                      <div className="mt-3 pt-3 border-t border-zinc-100/80">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span className="font-semibold">{CURRENCIES[trip.currency]?.symbol}</span>
                          {CURRENCIES[trip.currency]?.name || trip.currency}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Day Detail with Edit Mode
  if (selectedDay) {
    const day = editMode ? editedDay : selectedDay;
    const trip = trips.find(t => t.days?.some(d => d.day === day.day));

    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setSelectedDay(null); setEditMode(false); }} 
                    className="p-2.5 hover:bg-zinc-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm">Day {day.day}</span>
                      <span className="text-xs text-zinc-400">{formatDate(day.date)}</span>
                    </div>
                    <h1 className="text-lg font-semibold text-zinc-900">{day.title}</h1>
                  </div>
                </div>
                {!editMode ? (
                  <button 
                    onClick={() => { setEditMode(true); setEditedDay({...day}); }}
                    className="p-2.5 hover:bg-zinc-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                    title="Edit day"
                  >
                    <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={saveEditedDay}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-zinc-900/25 active:scale-[0.98]"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Morning */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-xl text-lg shadow-sm">☀</span>
                  <h4 className="font-medium text-zinc-900">Morning</h4>
                </div>
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      value={editedDay.morning?.activity || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        morning: { ...editedDay.morning, activity: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Activity"
                    />
                    <textarea
                      value={editedDay.morning?.description || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        morning: { ...editedDay.morning, description: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent resize-none transition-all shadow-sm"
                      placeholder="Description"
                      rows={2}
                    />
                    <input
                      value={editedDay.morning?.location || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        morning: { ...editedDay.morning, location: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Location"
                    />
                  </div>
                ) : (
                  <>
                    <h5 className="font-medium text-zinc-800 mb-1">{day.morning?.activity}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.morning?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.morning?.location}
                    </p>
                    {day.morning?.estimatedCost && (
                      <p className="text-xs text-emerald-600 font-medium">{day.morning.estimatedCost}</p>
                    )}
                  </>
                )}
              </div>

              {/* Lunch */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-emerald-100/50">
                <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-emerald-200 to-emerald-300 text-emerald-700 rounded-xl shadow-sm">🥗</span>
                <div className="flex-1">
                  <span className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Lunch</span>
                  {editMode ? (
                    <input
                      value={editedDay.meals?.lunch || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        meals: { ...editedDay.meals, lunch: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent shadow-sm"
                    />
                  ) : (
                    <p className="text-sm text-zinc-700">{day.meals?.lunch}</p>
                  )}
                </div>
              </div>

              {/* Afternoon */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 rounded-xl text-lg shadow-sm">◐</span>
                  <h4 className="font-medium text-zinc-900">Afternoon</h4>
                </div>
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      value={editedDay.afternoon?.activity || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        afternoon: { ...editedDay.afternoon, activity: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Activity"
                    />
                    <textarea
                      value={editedDay.afternoon?.description || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        afternoon: { ...editedDay.afternoon, description: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent resize-none transition-all shadow-sm"
                      placeholder="Description"
                      rows={2}
                    />
                    <input
                      value={editedDay.afternoon?.location || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        afternoon: { ...editedDay.afternoon, location: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Location"
                    />
                  </div>
                ) : (
                  <>
                    <h5 className="font-medium text-zinc-800 mb-1">{day.afternoon?.activity}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.afternoon?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.afternoon?.location}
                    </p>
                    {day.afternoon?.estimatedCost && (
                      <p className="text-xs text-emerald-600 font-medium">{day.afternoon.estimatedCost}</p>
                    )}
                  </>
                )}
              </div>

              {/* Dinner */}
              <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-rose-100/50">
                <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-rose-200 to-rose-300 text-rose-700 rounded-xl shadow-sm">🍽</span>
                <div className="flex-1">
                  <span className="text-xs text-rose-600 font-medium uppercase tracking-wide">Dinner</span>
                  {editMode ? (
                    <input
                      value={editedDay.meals?.dinner || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        meals: { ...editedDay.meals, dinner: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent shadow-sm"
                    />
                  ) : (
                    <p className="text-sm text-zinc-700">{day.meals?.dinner}</p>
                  )}
                </div>
              </div>

              {/* Evening */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 rounded-xl text-lg shadow-sm">☾</span>
                  <h4 className="font-medium text-zinc-900">Evening</h4>
                </div>
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      value={editedDay.evening?.activity || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        evening: { ...editedDay.evening, activity: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Activity"
                    />
                    <textarea
                      value={editedDay.evening?.description || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        evening: { ...editedDay.evening, description: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent resize-none transition-all shadow-sm"
                      placeholder="Description"
                      rows={2}
                    />
                    <input
                      value={editedDay.evening?.location || ''}
                      onChange={(e) => setEditedDay({
                        ...editedDay,
                        evening: { ...editedDay.evening, location: e.target.value }
                      })}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all shadow-sm"
                      placeholder="Location"
                    />
                  </div>
                ) : (
                  <>
                    <h5 className="font-medium text-zinc-800 mb-1">{day.evening?.activity}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.evening?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.evening?.location}
                    </p>
                    {day.evening?.estimatedCost && (
                      <p className="text-xs text-emerald-600 font-medium">{day.evening.estimatedCost}</p>
                    )}
                  </>
                )}
              </div>

              {/* Cost breakdown */}
              {day.costs && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center shadow-lg mb-4">
                  <span className="block mb-2 font-medium">Cost Breakdown for Day {day.day}</span>
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    <div>Food: <span className="font-semibold text-emerald-700">{day.costs.food || '-'}</span></div>
                    <div>Hotel: <span className="font-semibold text-blue-700">{day.costs.hotel || '-'}</span></div>
                    <div>Transport: <span className="font-semibold text-amber-700">{day.costs.transport || '-'}</span></div>
                    <div>Subtotal: <span className="font-semibold text-zinc-900">{day.costs.subtotal || '-'}</span></div>
                  </div>
                </div>
              )}
              {/* Cost */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-center shadow-xl shadow-emerald-500/30">
                <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">Estimated Cost for Day {day.day}</span>
                {editMode ? (
                  <input
                    value={editedDay.estimatedCost || ''}
                    onChange={(e) => setEditedDay({ ...editedDay, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-center text-xl font-semibold mt-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent shadow-lg"
                  />
                ) : (
                  <p className="text-3xl font-bold mt-1">{day.estimatedCost}</p>
                )}
              </div>

              {editMode && (
                <button
                  onClick={() => { setEditMode(false); setEditedDay(null); }}
                  className="w-full py-3 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-all shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trip Calendar View
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-5 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                {/* Journey Route - From → To */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selectedTrip.source && (
                    <>
                      <span className="text-zinc-600 font-medium">{selectedTrip.source}</span>
                      <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </>
                  )}
                  <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">
                    {selectedTrip.actualDestination || selectedTrip.destination}
                  </h1>
                </div>
                {/* Show original search term if resolved to different place (only if truly different, not just more specific) */}
                {selectedTrip.actualDestination && 
                 selectedTrip.actualDestination.toLowerCase() !== selectedTrip.destination.toLowerCase() && 
                 !selectedTrip.actualDestination.toLowerCase().includes(selectedTrip.destination.toLowerCase()) && (
                  <p className="text-blue-600 text-xs mb-1">
                    You searched for "{selectedTrip.destination}" → Planned for {selectedTrip.actualDestination}
                  </p>
                )}
                <p className="text-zinc-500 text-sm mt-1">{selectedTrip.summary}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {/* From Location Badge */}
                  {selectedTrip.source && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      From: {selectedTrip.source}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-full shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(selectedTrip.startDate)} - {formatDate(selectedTrip.endDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-medium rounded-full shadow-sm">
                    {selectedTrip.totalBudget}
                  </span>
                  {selectedTrip.currency && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full shadow-sm">
                      <span className="font-semibold">{CURRENCIES[selectedTrip.currency]?.symbol || ''}</span> {selectedTrip.currency}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setNewBudget(selectedTrip.budgetAmount?.toString() || '');
                    setShowBudgetEditModal(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                >
                  ✏️ Edit Budget
                </button>
                <button
                  onClick={() => navigate(`/budget/${selectedTrip.id}`)}
                  className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-zinc-900/25"
                >
                  💰 Track Budget
                </button>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="px-4 py-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-white/80 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
                >
                  ← Back
                </button>
                <button
                  onClick={() => deleteTrip(selectedTrip.id)}
                  className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Travel Tickets Card */}
          {selectedTrip.travelInfo && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">Travel Tickets</h3>
                  <p className="text-xs text-zinc-500">Estimated costs for your journey</p>
                </div>
              </div>
              
              {/* To and Fro Tickets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Onward Journey */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">→</span>
                    <span className="text-sm font-medium text-blue-800">Onward Journey</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">From</span>
                        <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.from || selectedTrip.source || 'Your City'}</span>
                      </div>
                      {selectedTrip.travelInfo.fromStation && (
                        <span className="text-xs text-blue-600 text-right">{selectedTrip.travelInfo.fromStation}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">To</span>
                        <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.to || selectedTrip.actualDestination || selectedTrip.destination}</span>
                      </div>
                      {selectedTrip.travelInfo.toStation && (
                        <span className="text-xs text-blue-600 text-right">{selectedTrip.travelInfo.toStation}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Mode</span>
                      <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.recommendedMode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Duration</span>
                      <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.travelDuration}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <span className="text-xs font-medium text-blue-700">Ticket Cost</span>
                      <span className="text-lg font-bold text-blue-700">{selectedTrip.travelInfo.estimatedTicketCost}</span>
                    </div>
                  </div>
                </div>
                
                {/* Return Journey */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">←</span>
                    <span className="text-sm font-medium text-purple-800">Return Journey</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">From</span>
                        <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.to || selectedTrip.actualDestination || selectedTrip.destination}</span>
                      </div>
                      {selectedTrip.travelInfo.toStation && (
                        <span className="text-xs text-purple-600 text-right">{selectedTrip.travelInfo.toStation}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">To</span>
                        <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.from || selectedTrip.source || 'Your City'}</span>
                      </div>
                      {selectedTrip.travelInfo.fromStation && (
                        <span className="text-xs text-purple-600 text-right">{selectedTrip.travelInfo.fromStation}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Mode</span>
                      <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.recommendedMode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600">Duration</span>
                      <span className="text-sm font-medium text-zinc-900">{selectedTrip.travelInfo.travelDuration}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                      <span className="text-xs font-medium text-purple-700">Ticket Cost</span>
                      <span className="text-lg font-bold text-purple-700">{selectedTrip.travelInfo.estimatedTicketCost}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total & Tips */}
              <div className="mt-4 pt-4 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700">Total Travel Cost (Round Trip)</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {selectedTrip.travelInfo.estimatedTicketCost?.replace(/[\d,.]+/, (match) => (parseFloat(match.replace(/,/g, '')) * 2).toLocaleString())}
                  </span>
                </div>
                {selectedTrip.travelInfo.tips && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 rounded-xl">
                    <span className="text-amber-500">💡</span>
                    <p className="text-xs text-amber-800">{selectedTrip.travelInfo.tips}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Days Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTrip.days?.map((day) => (
              <div
                key={day.day}
                onClick={() => setSelectedDay(day)}
                className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 cursor-pointer hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-3 py-1 rounded-lg shadow-sm">Day {day.day}</span>
                  <span className="text-xs text-zinc-400">{formatDate(day.date)}</span>
                </div>
                <h3 className="font-medium text-zinc-900 mb-1.5 group-hover:text-zinc-700 transition-colors">{day.title}</h3>
                <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{day.summary}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg text-amber-600 shadow-sm">☀</span>
                    <span className="truncate">{day.morning?.activity}</span>
                    {day.morning?.coordinates && (
                      <span className="ml-2 text-[10px] text-blue-500">[{day.morning.coordinates.lat}, {day.morning.coordinates.lng}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-blue-600 shadow-sm">◐</span>
                    <span className="truncate">{day.afternoon?.activity}</span>
                    {day.afternoon?.coordinates && (
                      <span className="ml-2 text-[10px] text-blue-500">[{day.afternoon.coordinates.lat}, {day.afternoon.coordinates.lng}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg text-indigo-600 shadow-sm">☾</span>
                    <span className="truncate">{day.evening?.activity}</span>
                    {day.evening?.coordinates && (
                      <span className="ml-2 text-[10px] text-blue-500">[{day.evening.coordinates.lat}, {day.evening.coordinates.lng}]</span>
                    )}
                  </div>
                </div>
                {/* Daily cost breakdown */}
                {day.costs && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                    <div>Food: <span className="font-semibold text-emerald-700">{day.costs.food || '-'}</span></div>
                    <div>Hotel: <span className="font-semibold text-blue-700">{day.costs.hotel || '-'}</span></div>
                    <div>Transport: <span className="font-semibold text-amber-700">{day.costs.transport || '-'}</span></div>
                    <div>Subtotal: <span className="font-semibold text-zinc-900">{day.costs.subtotal || '-'}</span></div>
                  </div>
                )}
                {day.estimatedCost && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Est. cost</span>
                    <span className="text-sm font-semibold text-emerald-700">{day.estimatedCost}</span>
                  </div>
                )}
                <div className="mt-2 text-center">
                  <span className="text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view/edit
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Packing List */}
          {selectedTrip.packingList && selectedTrip.packingList.length > 0 && (
            <div className="mt-6 bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-5 shadow-lg shadow-zinc-200/30">
              <h4 className="font-medium text-zinc-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Packing Suggestions
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTrip.packingList.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-zinc-100 to-zinc-50 text-zinc-700 text-sm rounded-lg border border-zinc-200/60 shadow-sm">{item}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget Edit Modal */}
      {showBudgetEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Edit Budget</h3>
                <p className="text-sm text-zinc-500">Adjust budget to regenerate your plan</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="bg-zinc-50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Current Budget:</span>
                  <span className="font-semibold text-zinc-900">
                    {CURRENCIES[selectedTrip.currency]?.symbol || '₹'}{selectedTrip.budgetAmount?.toLocaleString() || 'Not set'}
                  </span>
                </div>
              </div>

              <label className="block text-sm font-medium text-zinc-700 mb-2">New Budget</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                  {CURRENCIES[selectedTrip.currency]?.symbol || '₹'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter new budget"
                  className="w-full pl-8 pr-4 py-3 bg-white border border-zinc-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              {newBudget && selectedTrip.budgetAmount && (
                <p className={`text-xs mt-2 ${parseFloat(newBudget) > selectedTrip.budgetAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {parseFloat(newBudget) > selectedTrip.budgetAmount 
                    ? `↑ Budget increased by ${CURRENCIES[selectedTrip.currency]?.symbol}${(parseFloat(newBudget) - selectedTrip.budgetAmount).toLocaleString()} - Plan will include upgraded options`
                    : parseFloat(newBudget) < selectedTrip.budgetAmount
                    ? `↓ Budget decreased by ${CURRENCIES[selectedTrip.currency]?.symbol}${(selectedTrip.budgetAmount - parseFloat(newBudget)).toLocaleString()} - Plan will focus on budget-friendly options`
                    : ''}
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-lg">💡</span>
                <p className="text-xs text-blue-700">
                  Changing your budget will regenerate the entire trip plan with adjusted accommodations, activities, and recommendations to fit your new budget.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBudgetEditModal(false);
                  setNewBudget('');
                }}
                disabled={regenerating}
                className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={regeneratePlanWithBudget}
                disabled={regenerating || !newBudget || parseFloat(newBudget) === selectedTrip.budgetAmount}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {regenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
