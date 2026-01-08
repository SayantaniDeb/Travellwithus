import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { auth, db } from '../Firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './Navbar';

const LLM_PROVIDER = 'groq'; // 'groq', 'gemini', or 'openai'

// Currency data with symbols and location mapping
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', countries: ['united states', 'usa', 'america'] },
  EUR: { symbol: '€', name: 'Euro', countries: ['germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'portugal', 'austria', 'ireland', 'greece', 'finland'] },
  GBP: { symbol: '£', name: 'British Pound', countries: ['united kingdom', 'uk', 'england', 'scotland', 'wales'] },
  INR: { symbol: '₹', name: 'Indian Rupee', countries: ['india'] },
  JPY: { symbol: '¥', name: 'Japanese Yen', countries: ['japan'] },
  CNY: { symbol: '¥', name: 'Chinese Yuan', countries: ['china'] },
  AUD: { symbol: 'A$', name: 'Australian Dollar', countries: ['australia'] },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', countries: ['canada'] },
  CHF: { symbol: 'Fr', name: 'Swiss Franc', countries: ['switzerland'] },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', countries: ['singapore'] },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', countries: ['uae', 'dubai', 'abu dhabi', 'united arab emirates'] },
  THB: { symbol: '฿', name: 'Thai Baht', countries: ['thailand'] },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', countries: ['malaysia'] },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['indonesia', 'bali'] },
  KRW: { symbol: '₩', name: 'South Korean Won', countries: ['south korea', 'korea'] },
  MXN: { symbol: 'Mex$', name: 'Mexican Peso', countries: ['mexico'] },
  BRL: { symbol: 'R$', name: 'Brazilian Real', countries: ['brazil'] },
  ZAR: { symbol: 'R', name: 'South African Rand', countries: ['south africa'] },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['new zealand'] },
  SEK: { symbol: 'kr', name: 'Swedish Krona', countries: ['sweden'] },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', countries: ['norway'] },
  DKK: { symbol: 'kr', name: 'Danish Krone', countries: ['denmark'] },
  RUB: { symbol: '₽', name: 'Russian Ruble', countries: ['russia'] },
  TRY: { symbol: '₺', name: 'Turkish Lira', countries: ['turkey'] },
  PHP: { symbol: '₱', name: 'Philippine Peso', countries: ['philippines'] },
  VND: { symbol: '₫', name: 'Vietnamese Dong', countries: ['vietnam'] },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', countries: ['egypt'] },
  PKR: { symbol: 'Rs', name: 'Pakistani Rupee', countries: ['pakistan'] },
  LKR: { symbol: 'Rs', name: 'Sri Lankan Rupee', countries: ['sri lanka'] },
  NPR: { symbol: 'Rs', name: 'Nepalese Rupee', countries: ['nepal'] },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka', countries: ['bangladesh'] },
};

// Get currency based on location name
const getCurrencyFromLocation = (locationName) => {
  if (!locationName) return 'USD';
  const lowerLocation = locationName.toLowerCase();
  
  for (const [code, data] of Object.entries(CURRENCIES)) {
    if (data.countries.some(country => lowerLocation.includes(country))) {
      return code;
    }
  }
  return 'USD';
};

export default function TripPlanner() {
  const [searchParams] = useSearchParams();
  const destination = searchParams.get('destination') || '';
  const navigate = useNavigate();
  
  const [step, setStep] = useState('dates'); // 'dates', 'loading', 'calendar', 'dayDetail'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sourceLocation, setSourceLocation] = useState(''); // Pickup point / source
  const [budgetAmount, setBudgetAmount] = useState('');
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const { locationName } = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Set currency and source location based on user's location
  useEffect(() => {
    if (locationName) {
      const detectedCurrency = getCurrencyFromLocation(locationName);
      setCurrency(detectedCurrency);
      // Set source location as default if not already set
      if (!sourceLocation) {
        setSourceLocation(locationName);
      }
    }
  }, [locationName]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const generatePlan = async () => {
    const numDays = calculateDays();
    if (numDays < 1 || numDays > 30) {
      setError('Please select a valid date range (1-30 days)');
      return;
    }

    setStep('loading');
    setLoading(true);
    setError(null);

    const currencySymbol = CURRENCIES[currency]?.symbol || '$';
    const budgetInfo = budgetAmount ? ` Budget: ${currencySymbol}${budgetAmount}.` : '';

    const prompt = `Create a ${numDays}-day travel plan for "${destination}"${sourceLocation ? ` from ${sourceLocation}` : ''}.

Dates: ${startDate} to ${endDate}. Currency: ${currency} (${currencySymbol}).${budgetInfo}

Return ONLY valid JSON:
{
  "destination": "${destination}",
  "source": "${sourceLocation || ''}",
  "summary": "Brief trip overview",
  "currency": "${currency}",
  "currencySymbol": "${currencySymbol}",
  "budgetAmount": ${budgetAmount || 0},
  "travelInfo": {
    "from": "${sourceLocation || ''}",
    "to": "${destination}",
    "recommendedMode": "Flight/Train/Bus/Car",
    "estimatedTicketCost": "${currencySymbol}XXX",
    "travelDuration": "X hours",
    "tips": "Travel tip"
  },
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "title": "Day title",
      "summary": "Day summary",
      "morning": {"activity": "Activity", "description": "Description", "location": "Place", "coordinates": {"lat": 0.0, "lng": 0.0}, "duration": "2h"},
      "afternoon": {"activity": "Activity", "description": "Description", "location": "Place", "coordinates": {"lat": 0.0, "lng": 0.0}, "duration": "3h"},
      "evening": {"activity": "Activity", "description": "Description", "location": "Place", "coordinates": {"lat": 0.0, "lng": 0.0}, "duration": "2h"},
      "meals": {"breakfast": "Food", "lunch": "Food", "dinner": "Food"},
      "tips": ["Tip"],
      "estimatedCost": "${currencySymbol}XX"
    }
  ],
  "packingList": ["Item1", "Item2"],
  "totalBudget": "${currencySymbol}XXX"
}

Generate ${numDays} days with real ${destination} locations and accurate GPS coordinates. Keep descriptions brief.`;

    try {
      let response;
      let text;

      if (LLM_PROVIDER === 'groq') {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) throw new Error('Groq API key not configured. Get it free at: https://console.groq.com/keys');

        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a travel planner. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 8000,
            temperature: 0.7
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
        text = data.choices?.[0]?.message?.content;

      } else if (LLM_PROVIDER === 'gemini') {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key not configured');

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (text) {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        // Try to fix truncated JSON by attempting to close it
        try {
          const planData = JSON.parse(cleanText);
          planData.startDate = startDate;
          planData.endDate = endDate;
          planData.source = sourceLocation;
          planData.currency = currency;
          planData.currencySymbol = currencySymbol;
          setPlan(planData);
          setStep('calendar');
        } catch (parseErr) {
          // If JSON is truncated, try to fix common issues
          console.warn('JSON parse error, attempting to fix:', parseErr.message);
          
          // Try adding closing brackets/braces
          let fixedText = cleanText;
          const openBraces = (cleanText.match(/{/g) || []).length;
          const closeBraces = (cleanText.match(/}/g) || []).length;
          const openBrackets = (cleanText.match(/\[/g) || []).length;
          const closeBrackets = (cleanText.match(/\]/g) || []).length;
          
          // Add missing closing brackets and braces
          for (let i = 0; i < openBrackets - closeBrackets; i++) fixedText += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) fixedText += '}';
          
          try {
            const planData = JSON.parse(fixedText);
            planData.startDate = startDate;
            planData.endDate = endDate;
            planData.source = sourceLocation;
            planData.currency = currency;
            planData.currencySymbol = currencySymbol;
            setPlan(planData);
            setStep('calendar');
          } catch (fixErr) {
            throw new Error('The AI response was truncated. Please try again with fewer days or a shorter trip.');
          }
        }
      } else {
        throw new Error('No response from AI');
      }

    } catch (err) {
      console.error('Error generating plan:', err);
      setError(err.message || 'Failed to generate plan');
      setStep('dates');
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    if (!user) {
      alert('Please login to save your trip');
      return;
    }

    setSaving(true);
    try {
      const tripRef = collection(db, 'users', user.uid, 'trips');
      const docRef = await addDoc(tripRef, {
        ...plan,
        source: sourceLocation,
        currency,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('Trip saved successfully! 🎉');
      // Navigate to budget tracker for this trip
      navigate(`/budget/${docRef.id}`);
    } catch (err) {
      console.error('Error saving trip:', err);
      alert('Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMinDate = () => new Date().toISOString().split('T')[0];

  // Currency Dropdown Component
  const CurrencySelector = ({ className = '' }) => (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 transition-all shadow-sm hover:shadow-md"
      >
        <span className="text-zinc-900 font-semibold">{CURRENCIES[currency]?.symbol}</span>
        <span>{currency}</span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showCurrencyDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-60 max-h-72 overflow-y-auto bg-white border border-zinc-200/60 rounded-2xl shadow-2xl shadow-zinc-200/50 z-50 backdrop-blur-sm">
            <div className="p-2">
              {Object.entries(CURRENCIES).map(([code, data]) => (
                <button
                  key={code}
                  onClick={() => { setCurrency(code); setShowCurrencyDropdown(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center justify-between transition-all ${currency === code ? 'bg-black text-white shadow-lg' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-8 text-center font-semibold ${currency === code ? 'text-white' : 'text-zinc-800'}`}>{data.symbol}</span>
                    <span>{data.name}</span>
                  </span>
                  <span className={`text-xs ${currency === code ? 'text-zinc-300' : 'text-zinc-400'}`}>{code}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Step 1: Date Selection
  if (step === 'dates') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto">
            {/* Back button */}
            <button 
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm mb-6 transition-all hover:-translate-x-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>

            {/* Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl overflow-hidden">
              {/* Header with gradient */}
              <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700">
                <h1 className="text-xl font-semibold text-white">Plan Your Trip</h1>
                <p className="text-blue-100 text-sm mt-1">to <span className="text-white font-medium">{destination}</span></p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {error && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                {/* Source / Pickup Point */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Traveling From <span className="text-zinc-400">(pickup point)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={sourceLocation}
                      onChange={(e) => setSourceLocation(e.target.value)}
                      placeholder="Enter your city or pickup location"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    {locationName ? `Auto-detected: ${locationName}` : 'Enter where you\'ll be starting from'}
                  </p>
                </div>

                {/* Date inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      min={getMinDate()}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || getMinDate()}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Budget Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Your Budget <span className="text-zinc-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">
                      {CURRENCIES[currency]?.symbol || '$'}
                    </span>
                    <input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="Enter your total budget"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">AI will plan activities within your budget</p>
                </div>

                {/* Currency selector */}
                <div className="flex items-center justify-between py-3 px-4 bg-zinc-100 rounded-xl border border-zinc-200">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Currency</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {locationName ? `Based on: ${locationName}` : 'Select your preferred currency'}
                    </p>
                  </div>
                  <CurrencySelector />
                </div>

                {/* Days indicator */}
                {startDate && endDate && (
                  <div className="text-center py-5 bg-black rounded-xl shadow-lg">
                    <span className="text-4xl font-bold text-white">{calculateDays()}</span>
                    <span className="text-zinc-300 ml-2">day{calculateDays() > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={generatePlan}
                  disabled={!startDate || !endDate}
                  className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all text-sm shadow-lg active:scale-[0.98]"
                >
                  Generate My Plan ✨
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">Creating Your Trip</h3>
          <p className="text-zinc-500 text-sm">Planning {calculateDays()} days in {destination}...</p>
          <div className="mt-6 flex justify-center gap-2">
            <span className="w-2.5 h-2.5 bg-zinc-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
            <span className="w-2.5 h-2.5 bg-zinc-700 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
            <span className="w-2.5 h-2.5 bg-zinc-800 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Calendar View
  if (step === 'calendar' && plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {sourceLocation && (
                      <span className="text-blue-100 text-sm">{sourceLocation} →</span>
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold text-white">{plan.destination}</h1>
                  </div>
                  <p className="text-blue-100 text-sm mt-1">{plan.summary}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-medium rounded-full">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(startDate)} - {formatDate(endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/30 text-white text-xs font-medium rounded-full">
                      💰 {plan.totalBudget}
                    </span>
                    {budgetAmount && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-medium rounded-full">
                        Budget: {CURRENCIES[currency]?.symbol}{budgetAmount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/home')}
                    className="px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={saveTrip}
                    disabled={saving}
                    className="px-5 py-2.5 bg-white text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 disabled:bg-white/50 disabled:text-blue-400 transition-all shadow-lg active:scale-[0.98]"
                  >
                    {saving ? 'Saving...' : 'Save & Track Budget 💰'}
                  </button>
                </div>
              </div>
            </div>

            {/* Travel Info Card */}
            {plan.travelInfo && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">Getting There</h3>
                    <p className="text-xs text-zinc-500">{plan.travelInfo.from} → {plan.travelInfo.to}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-zinc-500 mb-1">Mode</p>
                    <p className="text-sm font-medium text-zinc-900">{plan.travelInfo.recommendedMode}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-emerald-600 mb-1">Ticket Cost</p>
                    <p className="text-sm font-semibold text-emerald-700">{plan.travelInfo.estimatedTicketCost}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-zinc-500 mb-1">Duration</p>
                    <p className="text-sm font-medium text-zinc-900">{plan.travelInfo.travelDuration}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 col-span-2 sm:col-span-1">
                    <p className="text-xs text-blue-600 mb-1">Tip</p>
                    <p className="text-xs text-zinc-700">{plan.travelInfo.tips}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Days Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plan.days?.map((day) => (
                <div
                  key={day.day}
                  onClick={() => { setSelectedDay(day); setStep('dayDetail'); }}
                  className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 cursor-pointer hover:border-zinc-300 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-3 py-1 rounded-lg shadow-sm">Day {day.day}</span>
                    <span className="text-xs text-zinc-500">{formatDate(day.date)}</span>
                  </div>
                  <h3 className="font-medium text-zinc-900 mb-1.5 group-hover:text-zinc-700 transition-colors">{day.title}</h3>
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{day.summary}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-amber-100 rounded-lg text-amber-600">☀</span>
                      <span className="truncate">{day.morning?.activity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-lg text-blue-600">◐</span>
                      <span className="truncate">{day.afternoon?.activity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 rounded-lg text-indigo-600">☾</span>
                      <span className="truncate">{day.evening?.activity}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Est. cost</span>
                    <span className="text-sm font-semibold text-emerald-600">{day.estimatedCost || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Packing List */}
            {plan.packingList && plan.packingList.length > 0 && (
              <div className="mt-6 bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-5 shadow-xl">
                <h4 className="font-medium text-zinc-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Packing Suggestions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {plan.packingList.map((item, i) => (
                    <span key={i} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-sm rounded-lg border border-zinc-200">{item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Day Detail
  if (step === 'dayDetail' && selectedDay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-5 mb-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep('calendar')} 
                  className="p-2.5 hover:bg-zinc-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm">Day {selectedDay.day}</span>
                    <span className="text-xs text-zinc-400">{formatDate(selectedDay.date)}</span>
                  </div>
                  <h1 className="text-lg font-semibold text-zinc-900">{selectedDay.title}</h1>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Summary */}
              <p className="text-zinc-600 text-sm text-center italic bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-4 shadow-lg shadow-zinc-200/30">
                {selectedDay.summary}
              </p>

              {/* Morning */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-xl text-lg shadow-sm">☀</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-900">Morning</h4>
                    <p className="text-xs text-zinc-400">{selectedDay.morning?.duration}</p>
                  </div>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{selectedDay.morning?.activity}</h5>
                <p className="text-sm text-zinc-500 mb-2">{selectedDay.morning?.description}</p>
                {selectedDay.morning?.coordinates ? (
                  <button
                    onClick={() => navigate(`/Journeypath?lat=${selectedDay.morning.coordinates.lat}&lng=${selectedDay.morning.coordinates.lng}&name=${encodeURIComponent(selectedDay.morning.location)}`)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.morning.location} →
                  </button>
                ) : (
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.morning?.location}
                  </p>
                )}
              </div>

              {/* Lunch */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-emerald-100/50">
                <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-emerald-200 to-emerald-300 text-emerald-700 rounded-xl shadow-sm">🥗</span>
                <div>
                  <span className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Lunch</span>
                  <p className="text-sm text-zinc-700">{selectedDay.meals?.lunch}</p>
                </div>
              </div>

              {/* Afternoon */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 rounded-xl text-lg shadow-sm">◐</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-900">Afternoon</h4>
                    <p className="text-xs text-zinc-400">{selectedDay.afternoon?.duration}</p>
                  </div>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{selectedDay.afternoon?.activity}</h5>
                <p className="text-sm text-zinc-500 mb-2">{selectedDay.afternoon?.description}</p>
                {selectedDay.afternoon?.coordinates ? (
                  <button
                    onClick={() => navigate(`/Journeypath?lat=${selectedDay.afternoon.coordinates.lat}&lng=${selectedDay.afternoon.coordinates.lng}&name=${encodeURIComponent(selectedDay.afternoon.location)}`)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.afternoon.location} →
                  </button>
                ) : (
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.afternoon?.location}
                  </p>
                )}
              </div>

              {/* Dinner */}
              <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-rose-100/50">
                <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-rose-200 to-rose-300 text-rose-700 rounded-xl shadow-sm">🍽</span>
                <div>
                  <span className="text-xs text-rose-600 font-medium uppercase tracking-wide">Dinner</span>
                  <p className="text-sm text-zinc-700">{selectedDay.meals?.dinner}</p>
                </div>
              </div>

              {/* Evening */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 rounded-xl text-lg shadow-sm">☾</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-900">Evening</h4>
                    <p className="text-xs text-zinc-400">{selectedDay.evening?.duration}</p>
                  </div>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{selectedDay.evening?.activity}</h5>
                <p className="text-sm text-zinc-500 mb-2">{selectedDay.evening?.description}</p>
                {selectedDay.evening?.coordinates ? (
                  <button
                    onClick={() => navigate(`/Journeypath?lat=${selectedDay.evening.coordinates.lat}&lng=${selectedDay.evening.coordinates.lng}&name=${encodeURIComponent(selectedDay.evening.location)}`)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.evening.location} →
                  </button>
                ) : (
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedDay.evening?.location}
                  </p>
                )}
              </div>

              {/* Tips */}
              {selectedDay.tips?.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-2xl p-4 shadow-lg shadow-amber-100/50">
                  <h4 className="font-medium text-zinc-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Tips for Today
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedDay.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cost */}
              {selectedDay.estimatedCost && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center shadow-lg">
                  <span>Estimated Cost for Day {selectedDay.day}</span>
                  <p className="text-3xl font-bold mt-1">{selectedDay.estimatedCost}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
