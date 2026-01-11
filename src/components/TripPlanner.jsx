import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { auth, db } from '../Firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './Navbar';
import Bottom from './bottomfoot';

const LLM_PROVIDER = 'groq'; // 'groq', 'gemini', or 'openai'

// Helper function to call AI
const callAI = async (model, prompt, maxTokens = 8000) => {
  if (LLM_PROVIDER === 'groq') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key not configured. Get it free at: https://console.groq.com/keys');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a travel planner. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content;
  } else if (LLM_PROVIDER === 'openai') {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a travel planner. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content;
  }
};

// Currency data with symbols and location mapping
const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee', countries: ['india'] },
  USD: { symbol: '$', name: 'US Dollar', countries: ['united states', 'usa', 'america'] },
  EUR: { symbol: '€', name: 'Euro', countries: ['germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'portugal', 'austria', 'ireland', 'greece', 'finland'] },

};

// Get currency based on location name
const getCurrencyFromLocation = (locationName) => {
  if (!locationName) return 'INR';
  const lowerLocation = locationName.toLowerCase();
  
  for (const [code, data] of Object.entries(CURRENCIES)) {
    if (data.countries.some(country => lowerLocation.includes(country))) {
      return code;
    }
  }
  return 'INR';
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
  const [currency, setCurrency] = useState('INR');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showHotelPopup, setShowHotelPopup] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const { locationName } = useLocation();

  // Cache key for this trip planner session
  const cacheKey = `tripPlanner_${destination}`;

  // Load cached state on mount
  useEffect(() => {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setStep(parsed.step || 'dates');
        setStartDate(parsed.startDate || '');
        setEndDate(parsed.endDate || '');
        setSourceLocation(parsed.sourceLocation || '');
        setBudgetAmount(parsed.budgetAmount || '');
        setPlan(parsed.plan || null);
        setSelectedDay(parsed.selectedDay || null);
        setCurrency(parsed.currency || 'INR');
      } catch (err) {
        console.error('Error loading cached trip data:', err);
      }
    }
  }, [cacheKey]);

  // Save state to cache whenever it changes
  useEffect(() => {
    const stateToCache = {
      step,
      startDate,
      endDate,
      sourceLocation,
      budgetAmount,
      plan,
      selectedDay,
      currency
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(stateToCache));
  }, [step, startDate, endDate, sourceLocation, budgetAmount, plan, selectedDay, currency, cacheKey]);

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

    // --- STRICT VALIDATIONS ---
    // 1. Budget validation: must be pure numeric (no alpha/alphanumeric)
    if (budgetAmount && !/^(\d+)(\.\d{1,2})?$/.test(budgetAmount.trim())) {
      setError('Invalid budget amount');
      return;
    }

    // 2. Date validation: start date must not be before today
    if (!startDate || !endDate) {
      setError('Invalid start date');
      return;
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start < today) {
      setError('Invalid start date');
      return;
    }
    if (end < start) {
      setError('End date cannot be before start date');
      return;
    }
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
      "morning": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h"},
      "afternoon": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "3h"},
      "evening": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h"},
      "meals": {"breakfast": "Food", "lunch": "Food", "dinner": "Food"},
      "tips": ["Tip"]
    }
  ],
  "packingList": ["Item1", "Item2"],
  "totalBudget": "${currencySymbol}XXX"
}

Generate ${numDays} days with real ${destination} locations. Keep descriptions brief.`;

    try {
      let text;

      if (LLM_PROVIDER === 'groq') {
        // Planning Agent: Generate basic plan without costs
        text = await callAI('openai/gpt-oss-20b', prompt, 6000);

      } else if (LLM_PROVIDER === 'openai') {
        // Planning Agent: Generate basic plan without costs
        text = await callAI('gpt-4o', prompt, 6000);
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
        let planData;
        try {
          planData = JSON.parse(cleanText);
        } catch (parseErr) {
          console.error('Initial JSON parse failed:', parseErr.message);
          // If JSON is truncated, try to fix common issues
          let fixedText = cleanText;
          
          // Count braces and brackets
          const openBraces = (cleanText.match(/{/g) || []).length;
          const closeBraces = (cleanText.match(/}/g) || []).length;
          const openBrackets = (cleanText.match(/\[/g) || []).length;
          const closeBrackets = (cleanText.match(/\]/g) || []).length;
          
          // Add missing closing brackets and braces
          for (let i = 0; i < openBrackets - closeBrackets; i++) fixedText += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) fixedText += '}';
          
          try {
            planData = JSON.parse(fixedText);
          } catch (secondErr) {
            console.error('Second JSON parse failed:', secondErr.message);
            // Try a more aggressive fix - find the last valid JSON structure
            try {
              // Look for the last complete object in the response
              const lastBraceIndex = cleanText.lastIndexOf('}');
              if (lastBraceIndex > 0) {
                const truncatedText = cleanText.substring(0, lastBraceIndex + 1);
                planData = JSON.parse(truncatedText);
              } else {
                throw new Error('Unable to parse JSON response from AI');
              }
            } catch (thirdErr) {
              console.error('Third JSON parse failed:', thirdErr.message);
              throw new Error('AI returned invalid JSON. Please try again.');
            }
          }
        }
        planData.startDate = startDate;
        planData.endDate = endDate;
        planData.source = sourceLocation;
        planData.currency = currency;
        planData.currencySymbol = currencySymbol;

        // Cost Agent: Add detailed cost breakdowns for each day
        if (Array.isArray(planData.days)) {
          for (let i = 0; i < planData.days.length; i++) {
            const day = planData.days[i];
            const costPrompt = `For this day in ${destination}: ${day.title} - ${day.summary}

Morning: ${day.morning.activity} at ${day.morning.location}
Afternoon: ${day.afternoon.activity} at ${day.afternoon.location}
Evening: ${day.evening.activity} at ${day.evening.location}

Provide realistic mid-range cost breakdown in ${currency} (${currencySymbol}) for a typical traveler in ${destination}. Use current average prices. Include transport, food, and activity costs. Examples for ${destination}: food ₹500-1000/meal, transport ₹200-500/activity, activities ₹500-2000. Return ONLY JSON:
{
  "morningCost": "${currencySymbol}XXX (transport: ${currencySymbol}X, food: ${currencySymbol}X, activity: ${currencySymbol}X)",
  "afternoonCost": "${currencySymbol}XXX (transport: ${currencySymbol}X, food: ${currencySymbol}X, activity: ${currencySymbol}X)",
  "eveningCost": "${currencySymbol}XXX (transport: ${currencySymbol}X, food: ${currencySymbol}X, activity: ${currencySymbol}X)",
  "totalDayCost": "${currencySymbol}XXX"
}`;

            try {
              const costText = await callAI('openai/gpt-oss-20b', costPrompt, 2000);
              const costData = JSON.parse(costText);
              if (day.morning) day.morning.estimatedCost = costData.morningCost;
              if (day.afternoon) day.afternoon.estimatedCost = costData.afternoonCost;
              if (day.evening) day.evening.estimatedCost = costData.eveningCost;
              day.estimatedCost = costData.totalDayCost;
            } catch (err) {
              console.error('Error getting costs for day', i+1, err);
              // Fallback costs
              if (day.morning) day.morning.estimatedCost = `${currencySymbol}100 (est.)`;
              if (day.afternoon) day.afternoon.estimatedCost = `${currencySymbol}150 (est.)`;
              if (day.evening) day.evening.estimatedCost = `${currencySymbol}200 (est.)`;
              day.estimatedCost = `${currencySymbol}450 (est.)`;
            }
          }
        }

        // --- STRICT COST VS BUDGET VALIDATION ---
        const enteredBudget = budgetAmount ? parseFloat(budgetAmount) : 0;
        let ticketCost = 0;
        if (planData.travelInfo?.estimatedTicketCost) {
          // Extract number from string like "$123"
          const match = planData.travelInfo.estimatedTicketCost.match(/[\d,.]+/);
          if (match) ticketCost = parseFloat(match[0].replace(/,/g, ''));
        }
        let dayCosts = 0;
        if (Array.isArray(planData.days)) {
          dayCosts = planData.days.reduce((sum, day) => {
            if (day.estimatedCost) {
              const match = day.estimatedCost.match(/[\d,.]+/);
              if (match) return sum + parseFloat(match[0].replace(/,/g, ''));
            }
            return sum;
          }, 0);
        }
        let totalBudget = 0;
        if (planData.totalBudget) {
          const match = planData.totalBudget.match(/[\d,.]+/);
          if (match) totalBudget = parseFloat(match[0].replace(/,/g, ''));
        }
        // If any cost exceeds budget, show error
        if (
          enteredBudget > 0 && (
            ticketCost > enteredBudget ||
            dayCosts > enteredBudget ||
            totalBudget > enteredBudget
          )
        ) {
          // Find the minimum required amount
          const minRequired = Math.max(ticketCost, dayCosts, totalBudget);
          setError(`Not enough money. Minimum required: ${currencySymbol}${minRequired}`);
          setStep('dates');
          setLoading(false);
          return;
        }
        setPlan(planData);
        setStep('calendar');
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
      return null;
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
      setTripSaved(true); // Mark trip as saved
      // Stay on the current page
      return docRef;
    } catch (err) {
      console.error('Error saving trip:', err);
      alert('Failed to save trip. Please try again.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMinDate = () => new Date().toISOString().split('T')[0];

  // Currency Spinner Component
  const CurrencySelector = ({ className = '' }) => (
    <div className={className}>
      <select
        value={currency}
        onChange={e => setCurrency(e.target.value)}
        className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {Object.entries(CURRENCIES).map(([code, data]) => (
          <option key={code} value={code}>
            {data.symbol} {code} - {data.name}
          </option>
        ))}
      </select>
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
              onClick={() => {
                // Clear cache when going back to home
                sessionStorage.removeItem(cacheKey);
                navigate('/home');
              }}
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

                {/* Currency selector FIRST - contained inside card, no location tag */}
                <div className="py-3 px-4 bg-zinc-100 rounded-xl border border-zinc-200">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Currency</label>
                  <CurrencySelector className="w-full" />
                </div>

                {/* Budget Input SECOND */}
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

                {/* Days indicator */}
                {startDate && endDate && (
                  <div className="text-center py-5 bg-black rounded-xl shadow-lg">
                    <span className="text-4xl font-bold text-white">{calculateDays()}</span>
                    <span className="text-white ml-2">day{calculateDays() > 1 ? 's' : ''}</span>
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
      <div className="min-h-screen flex flex-col pb-16 bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg p-8 flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="relative flex items-center justify-center mb-2">
              <span className="block w-12 h-12 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></span>
              <span className="absolute w-6 h-6 bg-blue-50 rounded-full animate-pulse"></span>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Creating Your Plan</h3>
            <p className="text-zinc-500 text-base text-center">Planning <span className="font-semibold text-blue-700">{calculateDays()} days</span> in <span className="font-semibold text-blue-700">{destination}</span>...</p>
            <div className="flex gap-2 mt-4">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
            </div>
          </div>
        </div>
        <div className="w-full fixed bottom-0">
          <div className="hidden sm:block">
            <Bottom />
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      if (!user) {
                        setShowSignInPopup(true);
                        return;
                      }
                      saveTrip();
                    }}
                    disabled={saving}
                    className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-white text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 disabled:bg-white/50 disabled:text-blue-400 transition-all shadow-lg active:scale-[0.98] w-full sm:w-auto"
                  >
                    {saving ? 'Saving...' : 'Save Trip'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) {
                        setShowSignInPopup(true);
                        return;
                      }
                      
                      // Save trip first
                      const tripRef = await saveTrip();
                      if (tripRef) {
                        // Then navigate to budget tracking
                        navigate('/budget/' + tripRef.id, {
                          state: {
                            tripData: plan,
                            currency,
                            budgetAmount: budgetAmount ? parseFloat(budgetAmount) : 0,
                            fromPage: 'trip-planner'
                          }
                        });
                      }
                    }}
                    className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.98] w-full sm:w-auto"
                  >
                    Track Budget
                  </button>
                  <button
                    onClick={() => {
                      if (!user) {
                        setShowHotelPopup(true);
                        return;
                      }
                      if (!tripSaved) {
                        alert('Please save your trip first before searching for hotels.');
                        return;
                      }
                      navigate('/hotels', {
                        state: {
                          tripData: plan,
                          fromPage: 'trip-planner'
                        }
                      });
                    }}
                    className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all shadow-lg active:scale-[0.98] w-full sm:w-auto"
                  >
                    Search Hotel
                  </button>
                </div>
              </div>
            </div>

            {/* Ticket integration tip */}
            <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              <span>Travel journey ticket and hotel stay prices not included.</span>
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

        {/* Sign In Popup Modal */}
        {showSignInPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white/95 backdrop-blur-md p-6 shadow-lg">
              {/* Close button */}
              <button
                onClick={() => setShowSignInPopup(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col items-center space-y-4">
                {/* Image */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-semibold text-zinc-900">Sign In Required</h2>
                  <p className="text-sm text-zinc-600 mt-2">
                    To track your budget and save your trip plan, please sign in to your account.
                  </p>
                </div>

                <div className="flex flex-col w-full space-y-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowSignInPopup(false)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotel Search Popup Modal */}
        {showHotelPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white/95 backdrop-blur-md p-6 shadow-lg">
              {/* Close button */}
              <button
                onClick={() => setShowHotelPopup(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col items-center space-y-4">
                {/* Image */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-semibold text-zinc-900">Save Your Trip First</h2>
                  <p className="text-sm text-zinc-600 mt-2">
                    You need to save your trip before you can search for hotels. Please sign in and save your trip to continue.
                  </p>
                </div>

                <div className="flex flex-col w-full space-y-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                  >
                    Sign In & Save Trip
                  </button>
                  <button
                    onClick={async () => {
                      // Save trip first, then navigate to hotels
                      const tripRef = await saveTrip();
                      if (tripRef) {
                        setShowHotelPopup(false);
                        navigate('/hotels', {
                          state: {
                            tripData: plan,
                            fromPage: 'trip-planner'
                          }
                        });
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                  >
                    Save Trip & Search Hotels
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDay.morning?.location)}`} target="_blank" className="text-blue-600 hover:underline">{selectedDay.morning?.location}</a>
                </p>
                {selectedDay.morning?.estimatedCost && (
                  <p className="text-xs text-emerald-600 mt-1">{selectedDay.morning.estimatedCost}</p>
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
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDay.afternoon?.location)}`} target="_blank" className="text-blue-600 hover:underline">{selectedDay.afternoon?.location}</a>
                </p>
                {selectedDay.afternoon?.estimatedCost && (
                  <p className="text-xs text-emerald-600 mt-1">{selectedDay.afternoon.estimatedCost}</p>
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
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDay.evening?.location)}`} target="_blank" className="text-blue-600 hover:underline">{selectedDay.evening?.location}</a>
                </p>
                {selectedDay.evening?.estimatedCost && (
                  <p className="text-xs text-emerald-600 mt-1">{selectedDay.evening.estimatedCost}</p>
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
