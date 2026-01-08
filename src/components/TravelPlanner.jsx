import React, { useState } from 'react';
import { useLocation } from '../context/LocationContext';

const LLM_PROVIDER = 'groq'; // 'groq', 'gemini', or 'openai'

export default function TravelPlanner({ destination, onClose }) {
  const [step, setStep] = useState('dates'); // 'dates', 'loading', 'calendar', 'dayDetail'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { locationName } = useLocation();

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

    const prompt = `You are a travel planner. Create a detailed ${numDays}-day travel plan for "${destination}"${locationName ? ` for someone traveling from ${locationName}` : ''}.

Trip dates: ${startDate} to ${endDate}

IMPORTANT: Return ONLY valid JSON, no other text. Use this exact format:
{
  "destination": "${destination}",
  "summary": "Brief 1-2 sentence overview of the trip",
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "title": "Short catchy title for the day",
      "summary": "One sentence summary",
      "morning": {
        "activity": "Main morning activity",
        "description": "2-3 sentences about this",
        "location": "Place name",
        "duration": "Time needed"
      },
      "afternoon": {
        "activity": "Main afternoon activity",
        "description": "2-3 sentences about this",
        "location": "Place name",
        "duration": "Time needed"
      },
      "evening": {
        "activity": "Main evening activity",
        "description": "2-3 sentences about this",
        "location": "Place name",
        "duration": "Time needed"
      },
      "meals": {
        "breakfast": "Food recommendation",
        "lunch": "Food recommendation",
        "dinner": "Food recommendation"
      },
      "tips": ["Tip 1", "Tip 2"],
      "estimatedCost": "$XX-$XX"
    }
  ],
  "packingList": ["Item 1", "Item 2"],
  "totalBudget": "$XXX-$XXX"
}

Generate exactly ${numDays} days with incrementing dates starting from ${startDate}. Return ONLY JSON.`;

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
              { role: 'system', content: 'You are a travel planner. Return ONLY valid JSON, no markdown, no explanation.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 4000,
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
        // Clean up response
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();

        const planData = JSON.parse(cleanText);
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMinDate = () => new Date().toISOString().split('T')[0];

  // Step 1: Date Selection
  if (step === 'dates') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">📅 Plan Your Trip</h2>
                <p className="text-blue-100 mt-1">to {destination}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-gray-600 text-center">When are you traveling?</p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={getMinDate()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || getMinDate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {startDate && endDate && (
              <p className="text-center text-sm text-gray-500">{calculateDays()} day{calculateDays() > 1 ? 's' : ''} trip</p>
            )}

            <button
              onClick={generatePlan}
              disabled={!startDate || !endDate}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate My Plan ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Loading
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-slideUp">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Creating Your Perfect Trip</h3>
          <p className="text-gray-500">Planning {calculateDays()} amazing days in {destination}...</p>
          <div className="mt-4 flex justify-center gap-2 text-2xl">
            <span className="animate-bounce" style={{animationDelay: '0ms'}}>✈️</span>
            <span className="animate-bounce" style={{animationDelay: '100ms'}}>🏨</span>
            <span className="animate-bounce" style={{animationDelay: '200ms'}}>🍽️</span>
            <span className="animate-bounce" style={{animationDelay: '300ms'}}>📸</span>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Calendar View
  if (step === 'calendar' && plan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden animate-slideUp my-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">🗺️ {plan.destination}</h2>
                <p className="text-blue-100 text-sm sm:text-base mt-1">{plan.summary}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">📅 {formatDate(startDate)} - {formatDate(endDate)}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">💰 {plan.totalBudget}</span>
            </div>
          </div>

          <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {plan.days?.map((day) => (
                <div
                  key={day.day}
                  onClick={() => { setSelectedDay(day); setStep('dayDetail'); }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-zinc-900 text-white text-sm font-bold px-3 py-1 rounded-full">Day {day.day}</span>
                    <span className="text-xs text-gray-500">{formatDate(day.date)}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2 group-hover:text-zinc-600">{day.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{day.summary}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-2"><span>🌅</span><span className="truncate">{day.morning?.activity}</span></div>
                    <div className="flex items-center gap-2"><span>☀️</span><span className="truncate">{day.afternoon?.activity}</span></div>
                    <div className="flex items-center gap-2"><span>🌙</span><span className="truncate">{day.evening?.activity}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Est. cost</span>
                    <span className="text-sm font-semibold text-green-600">{day.estimatedCost}</span>
                  </div>
                  <div className="mt-2 text-center text-xs text-blue-500 opacity-0 group-hover:opacity-100">Click for details →</div>
                </div>
              ))}
            </div>

            {plan.packingList && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-bold text-yellow-800 mb-2">🎒 Packing Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  {plan.packingList.map((item, i) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">{item}</span>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden animate-slideUp my-2">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('calendar')} className="p-2 hover:bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center flex-1">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Day {selectedDay.day}</span>
                <h2 className="text-xl sm:text-2xl font-bold mt-2">{selectedDay.title}</h2>
                <p className="text-purple-100 text-sm mt-1">{formatDate(selectedDay.date)}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-150px)] space-y-4">
            <p className="text-gray-600 text-center italic">{selectedDay.summary}</p>

            {/* Morning */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌅</span>
                <h4 className="font-bold text-orange-800">Morning</h4>
                <span className="ml-auto text-sm text-orange-600">{selectedDay.morning?.duration}</span>
              </div>
              <h5 className="font-semibold text-gray-800">{selectedDay.morning?.activity}</h5>
              <p className="text-sm text-gray-600 mt-1">{selectedDay.morning?.description}</p>
              <p className="text-xs text-orange-600 mt-2">📍 {selectedDay.morning?.location}</p>
            </div>

            {/* Lunch */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">🥗</span>
              <div>
                <span className="text-xs text-green-600 font-medium">LUNCH</span>
                <p className="text-gray-800">{selectedDay.meals?.lunch}</p>
              </div>
            </div>

            {/* Afternoon */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">☀️</span>
                <h4 className="font-bold text-yellow-800">Afternoon</h4>
                <span className="ml-auto text-sm text-yellow-600">{selectedDay.afternoon?.duration}</span>
              </div>
              <h5 className="font-semibold text-gray-800">{selectedDay.afternoon?.activity}</h5>
              <p className="text-sm text-gray-600 mt-1">{selectedDay.afternoon?.description}</p>
              <p className="text-xs text-yellow-600 mt-2">📍 {selectedDay.afternoon?.location}</p>
            </div>

            {/* Dinner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">🍽️</span>
              <div>
                <span className="text-xs text-red-600 font-medium">DINNER</span>
                <p className="text-gray-800">{selectedDay.meals?.dinner}</p>
              </div>
            </div>

            {/* Evening */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌙</span>
                <h4 className="font-bold text-indigo-800">Evening</h4>
                <span className="ml-auto text-sm text-indigo-600">{selectedDay.evening?.duration}</span>
              </div>
              <h5 className="font-semibold text-gray-800">{selectedDay.evening?.activity}</h5>
              <p className="text-sm text-gray-600 mt-1">{selectedDay.evening?.description}</p>
              <p className="text-xs text-indigo-600 mt-2">📍 {selectedDay.evening?.location}</p>
            </div>

            {/* Tips */}
            {selectedDay.tips?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">💡 Tips for Today</h4>
                <ul className="space-y-1">
                  {selectedDay.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-500">•</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cost */}
            <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center">
              <span className="text-sm text-green-700">Estimated cost for Day {selectedDay.day}</span>
              <p className="text-2xl font-bold text-green-800">{selectedDay.estimatedCost}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
