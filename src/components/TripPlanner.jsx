import LoadingSpinner from './LoadingSpinner';
import { cleanLocationName } from '../utils/locationName';
import { parseEstimatedCost } from '../utils/tripBudget';
import { itineraryDayLabel } from '../utils/dayLabels';
import { canResumeTrip } from '../utils/tripNavigation';
import PlanBudgetWarning from './PlanBudgetWarning';
import TravelDayCost from './TravelDayCost';
import DayRefreshButton from './DayRefreshButton';
import BlankDayCard from './BlankDayCard';
import { extendTrip } from '../utils/extendTrip';
import JourneyTickets from './JourneyTickets';
import { applyJourneyLeg } from '../utils/journeyLegs';
import { readPlanningResponse } from '../utils/planningResponse';
import TravelDayActivities from './TravelDayActivities';
import { travelActivityTitle } from '../utils/travelSchedule';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { auth, db } from '../Firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from '../Firebase';
import Navbar from './Navbar';
import TripSetupForm from './TripSetupForm';
import BudgetTrackerPreview from './BudgetTrackerPreview';
import TripHeader from './TripHeader';
import { reserveTravelDays, refreshOnboardDay, attachTravelDirections } from '../utils/travelSchedule';
import DestinationAutocomplete from './DestinationAutocomplete';
import { requestTravelInfo, isUsableTravelInfo } from '../utils/travelInfo';
import JourneyDirections from './JourneyDirections';
import { localDate, addDays } from '../utils/tripDates';
import { isUsableTripPlan, replaceTripDay, periodRefreshPrompt, applyPeriodRefresh } from '../utils/tripPlan';

const LLM_PROVIDER = 'groq'; // 'groq', 'gemini', or 'openai'
const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to call AI via backend proxy
const callAI = async (model, prompt, maxTokens = 8000, options = {}) => {
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
      use_cache: options.useCache !== false,
      provider: LLM_PROVIDER
    })
  });

  return readPlanningResponse(response);
};

const generateTravelInfo = (source, destination, currency, mode = '') => requestTravelInfo(callAI, source, destination, currency, mode);

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
  const [destination, setDestination] = useState(() => searchParams.get('destination') || '');
  const navigate = useNavigate();
  const routeLocation = useRouterLocation();
  const [hydratedKey,setHydratedKey]=useState(null);

  const [step, setStep] = useState('dates'); // 'dates', 'loading', 'calendar', 'dayDetail'
  const [startDate, setStartDate] = useState(() => localDate());
  const [endDate, setEndDate] = useState(() => addDays(localDate(), 3));
  const [sourceLocation, setSourceLocation] = useState(''); // Pickup point / source
  const [budgetAmount, setBudgetAmount] = useState('10000');
  const [includeHotels, setIncludeHotels] = useState(true); // Toggle for hotel prices
  const [includeTravel, setIncludeTravel] = useState(true); // Toggle for travel costs
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [journeyEditorOpen, setJourneyEditorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showHotelPopup, setShowHotelPopup] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [refreshingDay, setRefreshingDay] = useState(null);
  const [refreshingPeriod, setRefreshingPeriod] = useState(null);
  const [refreshingTravel, setRefreshingTravel] = useState(false);
  const [travelMessage, setTravelMessage] = useState('');
  const { locationName } = useLocation();

  useEffect(() => {
    if (plan) sessionStorage.setItem('staysTripContext', JSON.stringify({ ...plan, plannerDestination: destination, source: sourceLocation, currency, budgetAmount }));
  }, [plan, sourceLocation, currency, budgetAmount, destination]);

  // Cache key for this trip planner session
  const cacheKey = `tripPlanner_${destination}`;

  // Restore before persisting, including a guest itinerary returned by Stays.
  useEffect(() => {
    try {
      const resume = routeLocation.state?.resumePlan;
      const cached = sessionStorage.getItem(cacheKey);
      const parsed = canResumeTrip(resume) ? {
        step:'calendar',plan:resume,startDate:resume.startDate,endDate:resume.endDate,
        sourceLocation:resume.source,currency:resume.currency,budgetAmount:resume.budgetAmount,
        includeHotels:resume.includeHotels,includeTravel:resume.includeTravel,
      } : cached ? JSON.parse(cached) : null;
      if (parsed) {
        const usable = canResumeTrip(parsed.plan);
        setStep(usable ? (parsed.step === 'dayDetail' && parsed.selectedDay ? 'dayDetail' : 'calendar') : 'dates');
        setPlan(usable ? parsed.plan : null);
        setSelectedDay(usable ? parsed.selectedDay || null : null);
        setStartDate(parsed.startDate || localDate());
        setEndDate(parsed.endDate || addDays(parsed.startDate || localDate(),3));
        setSourceLocation(cleanLocationName(parsed.sourceLocation));
        setBudgetAmount(parsed.budgetAmount ?? '10000');
        setCurrency(parsed.currency || 'INR');
        setIncludeHotels(parsed.includeHotels !== false);
        setIncludeTravel(parsed.includeTravel !== false);
      }
    } catch { setError('Could not restore the local draft.'); }
    setHydratedKey(cacheKey);
  }, [cacheKey,routeLocation.state]);

  // Save state to cache whenever it changes
  useEffect(() => {
    if (hydratedKey !== cacheKey) return;
    const stateToCache = {
      step,
      startDate,
      endDate,
      sourceLocation,
      budgetAmount,
      includeHotels,
      includeTravel,
      plan,
      selectedDay,
      currency
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(stateToCache));
  }, [step, startDate, endDate, sourceLocation, budgetAmount, includeHotels, includeTravel, plan, selectedDay, currency, cacheKey, hydratedKey]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Set currency and source location based on user's location
  useEffect(() => {
    if (cleanLocationName(locationName)) {
      const detectedCurrency = getCurrencyFromLocation(locationName);
      setCurrency(detectedCurrency);
      // Set source location as default if not already set
      if (!sourceLocation) {
        setSourceLocation(cleanLocationName(locationName));
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

  const generatePlan = async (options = {}) => {
    const refreshing = options.refresh === true;
    if (loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel) return;

    if (!cleanLocationName(destination)) {
      setError('Enter a real destination, including its city and country.');
      return;
    }
    if ((includeTravel || sourceLocation.trim()) && !cleanLocationName(sourceLocation)) {
      setError('Enter a real starting city and country before generating travel directions.');
      return;
    }

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

    if (!refreshing) setStep('loading');
    setLoading(true);
    setError(null);

    const currencySymbol = CURRENCIES[currency]?.symbol || '$';
    const budgetInfo = budgetAmount ? ` Budget: ${currencySymbol}${budgetAmount}.` : '';

    // Build optional sections based on user preferences
    const hotelSection = includeHotels ? `
ACCOMMODATION per night:
- Budget hostels/guesthouses: ₹500-₹1,500
- Mid-range hotels: ₹1,500-₹4,000
- Good hotels: ₹4,000-₹8,000
- Luxury/resorts: ₹8,000-₹25,000+` : '';

    const travelSection = includeTravel ? `
TRANSPORT (based on distance):
- Short distance (<200km): Bus ₹200-₹600, Train ₹150-₹500
- Medium distance (200-500km): Bus ₹600-₹1,200, Train ₹400-₹1,200, Flight ₹2,500-₹5,000
- Long distance (500km+): Bus ₹1,000-₹2,500, Train ₹800-₹2,500, Flight ₹3,500-₹12,000
- Hill stations/Himalayas from metros: Bus ₹1,200-₹2,500 (10-15hr), Train ₹600-₹1,800, Flight ₹4,000-₹10,000
- Volvo/AC buses cost 2-3x more than ordinary buses
- Sleeper trains: ₹400-₹1,500, AC trains: ₹800-₹3,000` : '';

    const travelInfoJson = includeTravel ? `
  "travelInfo": {
    "from": "${sourceLocation || ''}",
    "fromStation": "Departure airport/station name (e.g., Netaji Subhas Chandra Bose Airport (CCU) or Howrah Junction)",
    "to": "Actual destination name",
    "toStation": "Arrival airport/station name (e.g., Bagdogra Airport (IXB) or New Jalpaiguri (NJP))",
    "recommendedMode": "Flight/Train/Bus",
    "estimatedTicketCost": "${currencySymbol}XXX (MUST be realistic)",
    "travelDuration": "X hours",
    "tips": "Travel tip including booking advice"
  },` : '';

    const hotelInDayJson = includeHotels ? `
      "hotel": {"name": "Hotel name", "pricePerNight": "${currencySymbol}XXX", "type": "Budget/Mid-range/Luxury"},` : '';

    const prompt = `Create a ${numDays}-day travel plan for "${refreshing ? (plan.actualDestination || plan.destination || destination) : destination}"${sourceLocation ? ` from ${sourceLocation}` : ''}.

Dates: ${startDate} to ${endDate}. Currency: ${currency} (${currencySymbol}).${budgetInfo}
${includeHotels ? 'Include hotel recommendations with prices.' : 'Do NOT include hotel information.'}
${includeTravel ? 'Include travel/transport costs and recommendations.' : 'Do NOT include travel/transport information.'}

CRITICAL - Use REALISTIC 2024-2026 prices:
${currency === 'INR' ? `${travelSection}${hotelSection}

FOOD per day: ₹400-₹1,500 (street food to restaurants)
ACTIVITIES: Entry fees ₹50-₹500, guides ₹500-₹2,000
` : currency === 'USD' ? `
- Flights: $80-$400 one-way
- Hotels: Budget $40-$100, Mid $100-$250, Luxury $300+
- Food per day: $30-$100
` : `
- Flights: €60-€350 one-way
- Hotels: Budget €40-€100, Mid €100-€200, Luxury €250+
- Food per day: €25-€80
`}

IMPORTANT RULES:
1. If destination is vague (like "Himalaya", "beach", "hill station", "mountains"), pick a SPECIFIC popular place and use that actual name.
   Examples: "Himalaya" → "Manali, Himachal Pradesh" or "Darjeeling, West Bengal" or "Leh, Ladakh"
   "beach" → "Goa" or "Pondicherry", "hill station" → "Shimla" or "Ooty"
2. The "actualDestination" field MUST contain the real place name you're planning for.
${includeTravel ? `3. If traveling by FLIGHT, include the actual airport name/code (e.g., "Bagdogra Airport (IXB)")
4. If traveling by TRAIN, include the actual railway station name (e.g., "New Jalpaiguri (NJP)")
5. If traveling by BUS, include the bus terminal/stand name if applicable` : ''}

Return ONLY valid JSON:
{
  "destination": "${destination}",
  "actualDestination": "The REAL specific place name",
  "source": "${sourceLocation || ''}",
  "summary": "Brief trip overview",
  "currency": "${currency}",
  "currencySymbol": "${currencySymbol}",
  "budgetAmount": ${budgetAmount || 0},${travelInfoJson}
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "title": "Day title",
      "summary": "Day summary",${hotelInDayJson}
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

Generate ${numDays} days with real locations for the actual destination. Keep descriptions brief.
Travel fares, durations and tips are unverified estimates: do not claim live availability or confirmed fares.
${refreshing ? `Generate a different itinerary from these previous activities: ${JSON.stringify(plan.days.map(day => [day.morning?.activity, day.afternoon?.activity, day.evening?.activity]))}. Keep the destination and dates unchanged.` : ''}`;

    try {
      let text;

      if (LLM_PROVIDER === 'groq') {
        // Planning Agent: Generate basic plan without costs
        text = await callAI('openai/gpt-oss-20b', prompt, 6000, { useCache: !refreshing });

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
        if (!isUsableTripPlan(planData) || planData.days.length !== numDays) {
          throw new Error(planData?.message || 'The AI returned an incomplete itinerary. Please try again.');
        }
        planData.startDate = startDate;
        planData.endDate = endDate;
        planData.source = sourceLocation;
        planData.currency = currency;
        planData.currencySymbol = currencySymbol;
        planData.includeHotels = includeHotels;
        planData.includeTravel = includeTravel;

        // Missing transport data must not silently remove the journey section.
        if (includeTravel && sourceLocation.trim() && !isUsableTravelInfo(planData.travelInfo)) {
          try { planData.travelInfo = await generateTravelInfo(sourceLocation, planData.actualDestination || planData.destination || destination, currency); }
          catch { planData.travelInfo = null; }
        }

        if (includeTravel) {
          if (refreshing && plan.travelSchedule) planData.travelInfo = plan.travelInfo;
          planData = reserveTravelDays(planData);
        }

        // Cost Agent: Add detailed cost breakdowns for each day (only if budget tracking is needed)
        if (Array.isArray(planData.days) && (includeHotels || includeTravel || budgetAmount)) {
          for (let i = 0; i < planData.days.length; i++) {
            const day = planData.days[i];
            if (day.travelReservation) continue;
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

        // --- BUDGET VS COST COMPARISON (WARNING ONLY, NOT BLOCKING) ---
        const enteredBudget = budgetAmount ? parseFloat(budgetAmount) : 0;
        let ticketCost = 0;
        if (planData.travelInfo?.estimatedTicketCost) {
          const match = planData.travelInfo.estimatedTicketCost.match(/[\d,.]+/);
          if (match) ticketCost = parseFloat(match[0].replace(/,/g, '')) * 2;
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

        // Calculate total estimated cost (ticket + daily costs)
        const totalEstimatedCost = ticketCost + dayCosts;

        // Add budget warning to plan data (but don't block)
        if (enteredBudget > 0 && totalEstimatedCost > enteredBudget) {
          planData.budgetWarning = {
            userBudget: enteredBudget,
            estimatedCost: totalEstimatedCost,
            ticketCost: ticketCost,
            dailyCosts: dayCosts,
            difference: totalEstimatedCost - enteredBudget,
            message: `Estimated cost (${currencySymbol}${totalEstimatedCost.toLocaleString()}) exceeds your budget by ${currencySymbol}${(totalEstimatedCost - enteredBudget).toLocaleString()}`
          };
        }

        setPlan(planData);
        setTripSaved(false);
        setStep('calendar');
      } else {
        throw new Error('No response from AI');
      }

    } catch (err) {
      console.error('Error generating plan:', err);
      setError(err.message || 'Failed to generate plan');
      if (!refreshing) setStep('dates');
    } finally {
      setLoading(false);
    }
  };

  const saveJourneyCost = async (direction, costEstimate) => {
    setPlan(current=>({...current,travelInfo:direction==='return'?{...current.travelInfo,returnJourney:{...current.travelInfo.returnJourney,costEstimate}}:{...current.travelInfo,costEstimate},totalBudget:null,budgetWarning:null}));
    setTripSaved(false);
  };
  const addExtraDay = () => {
    try { const {plan:updated}=extendTrip(plan); setPlan(updated); setEndDate(updated.endDate); setTripSaved(false); }
    catch(err) {setError(err.message);}
  };
  const saveExtraDay = (index,day) => {setPlan(current=>replaceTripDay(current,index,day));setTripSaved(false);};
  const refreshDay = async (dayIndex) => {
    if (loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel) return;
    if (plan.days[dayIndex]?.travelReservation) {
      const updated = refreshOnboardDay(plan, dayIndex);
      setPlan(updated);
      setTripSaved(false);
      return;
    }
    setRefreshingDay(dayIndex);
    setError(null);
    const previousDay = plan.days[dayIndex];
    try {
      const text = await callAI('openai/gpt-oss-20b', `Replace just one day of this trip to ${plan.actualDestination || plan.destination}.
Return ONLY a JSON object with a days array containing exactly one day, using the same fields as the old day.
Old day: ${JSON.stringify(previousDay)}.
Other days (avoid duplicating their activities): ${JSON.stringify(plan.days.filter((_, index) => index !== dayIndex))}.
Keep day number ${previousDay.day}, date ${previousDay.date}, arrival/departure obligations, source ${sourceLocation}, currency ${currency}, and trip budget ${budgetAmount || 'flexible'}.
Offer different real activities with morning, afternoon and evening objects. Each needs activity, description, location, duration and estimatedCost. Include a numeric estimatedCost string for the full day and ${includeHotels ? 'a hotel recommendation' : 'no hotel'}. Costs are unverified estimates.`, 3000, { useCache: false });
      const result = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
      if (!isUsableTripPlan(result) || result.days.length !== 1) {
        throw new Error('A replacement day could not be generated. Please try again.');
      }
      setPlan(current => replaceTripDay(current, dayIndex, result.days[0]));
      setTripSaved(false);
    } catch (err) {
      setError(err.message || 'Could not refresh this day. Your itinerary has been kept.');
    } finally {
      setRefreshingDay(null);
    }
  };

  const refreshPeriod = async (period) => {
    if (loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel) return;
    const dayIndex = plan.days.findIndex(day => day.day === selectedDay.day && day.date === selectedDay.date);
    if (dayIndex < 0) return;
    const day = plan.days[dayIndex];
    if (day.travelReservation) {
      const updated = refreshOnboardDay(plan, dayIndex, period);
      setPlan(updated);
      setSelectedDay(updated.days[dayIndex]);
      setTripSaved(false);
      return;
    }
    setRefreshingPeriod(period);
    setError(null);
    try {
      const context = { ...plan, plannerDestination: destination, source: sourceLocation, currency, budgetAmount };
      const text = await callAI('openai/gpt-oss-20b', periodRefreshPrompt(context, dayIndex, period), 4000, { useCache: false });
      const replacement = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
      const updated = applyPeriodRefresh(plan, dayIndex, replacement);
      setPlan(updated);
      setSelectedDay(current => current?.day === day.day && current?.date === day.date ? updated.days[dayIndex] : current);
      setTripSaved(false);
    } catch (err) {
      setError(err.message || 'Could not refresh this activity. Your existing plan has been kept.');
    } finally {
      setRefreshingPeriod(null);
    }
  };

  const refreshTravel = async (mode = '', direction = 'onward') => {
    if (loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel) return;
    setRefreshingTravel(true);
    setTravelMessage('');
    setError(null);
    try {
      const target = plan.actualDestination || plan.destination || destination;
      const leg = await generateTravelInfo(direction === 'return' ? target : sourceLocation, direction === 'return' ? sourceLocation : target, currency, mode);
      const travelInfo = applyJourneyLeg(plan, leg, direction);
      // Prepare and validate before setting React state; updater errors are outside this try/catch.
      const result = attachTravelDirections(plan, travelInfo, sourceLocation);
      if (mode && !result.plan.travelSchedule) throw new Error(result.notice);
      setPlan(result.plan);
      setTravelMessage(result.notice || 'Travel directions added below. Journey days are reserved in your calendar.');
      setIncludeTravel(true);
      setTripSaved(false);
    } catch (err) { setTravelMessage(err.message || 'Could not get travel directions. Your itinerary has been kept.'); }
    finally { setRefreshingTravel(false); }
  };

  const reserveExistingTravel = () => {
    try {
      const updated = reserveTravelDays({ ...plan, source: sourceLocation, includeTravel });
      setPlan(updated);
      setSelectedDay(null);
      setTripSaved(false);
      setError(null);
    } catch (err) { setTravelMessage(err.message); setError(err.message); }
  };

  const saveTrip = async () => {
    if(loading||refreshingDay!==null||refreshingPeriod!==null||refreshingTravel||saving){setError('Wait for the plan and estimates to finish before saving.');return null;}
    if(!plan?.days?.length){setError('Generate a plan before saving.');return null;}
    const missing=plan.days.filter(day=>!day.travelReservation&&!day.isDraftDay&&!day.estimateCleared&&parseEstimatedCost(day.estimatedCost)===null);
    if(missing.length){setError('Daily estimates are missing. Refresh those days before saving so their costs are stored with the trip.');return null;}
    if (!user) {
      return null;
    }

    setSaving(true);
    try {
      const tripRef = collection(db, 'users', user.uid, 'trips');
      const docRef = doc(tripRef);
      const batch = writeBatch(db);
      const { draftExpenses = [], ...savedPlan } = plan;
      batch.set(docRef, {
        ...savedPlan,
        source: sourceLocation,
        currency,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      for (const { id, ...expense } of draftExpenses) {
        batch.set(doc(collection(docRef, 'expenses')), {...expense, createdAt: serverTimestamp()});
      }
      await batch.commit();
      setTripSaved(true); // Mark trip as saved
      // Clear cache and redirect to saved trips
      sessionStorage.removeItem(cacheKey);
      navigate('/saved-trips');
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

  // Step 1: Date Selection
  if (step === 'dates') {
    return (
      <div className="min-h-screen trip-page-background trip-setup-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            <TripSetupForm
              destination={destination} destinationProvided={Boolean(searchParams.get('destination')?.trim())} setDestination={setDestination} sourceLocation={sourceLocation} setSourceLocation={setSourceLocation}
              startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
              budgetAmount={budgetAmount} setBudgetAmount={setBudgetAmount} currency={currency} setCurrency={setCurrency}
              currencies={CURRENCIES} includeHotels={includeHotels} setIncludeHotels={setIncludeHotels}
              includeTravel={includeTravel} setIncludeTravel={setIncludeTravel} loading={loading} error={error}
              onGenerate={generatePlan}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg p-8 flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="relative flex items-center justify-center mb-2">
              <LoadingSpinner label="Building your itinerary…"/>
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
      </div>
    );
  }

  // Step 3: Calendar View
  if (step === 'calendar' && plan) {
    return (
      <div className="min-h-screen trip-page-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-5xl mx-auto">

            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
            <TripHeader destination={plan.actualDestination || plan.destination || destination} source={sourceLocation}
              summary={plan.summary} startDate={startDate} endDate={endDate} dayCount={plan.days?.length}
              budget={budgetAmount} currency={currency} symbol={CURRENCIES[currency]?.symbol || '₹'}>
                  <button
                    onClick={() => {
                      if (!user) {
                        setShowSignInPopup(true);
                        return;
                      }
                      saveTrip();
                    }}
                    disabled={saving || loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel}
                    className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
                            tripData: { ...plan, plannerDestination: destination, source: sourceLocation, currency, budgetAmount, includeHotels, includeTravel },
                            currency,
                            budgetAmount: budgetAmount ? parseFloat(budgetAmount) : 0,
                            fromPage: 'trip-planner'
                          }
                        });
                      }
                    }}
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Track Budget
                  </button>
                  <button
                    onClick={() => {
                      navigate('/hotels', {
                        state: {
                          tripData: { ...plan, plannerDestination: destination, source: sourceLocation, currency, budgetAmount, includeHotels, includeTravel },
                          fromPage: 'trip-planner'
                        }
                      });
                    }}
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Find stays
                  </button>
            {!plan.travelInfo && <button type="button" aria-expanded={journeyEditorOpen} onClick={() => setJourneyEditorOpen(value => !value)}>How to get there</button>}
            </TripHeader>
            <PlanBudgetWarning plan={plan} budget={budgetAmount} symbol={CURRENCIES[currency]?.symbol || '₹'} />
            {!plan.travelInfo && journeyEditorOpen && (<JourneyDirections plan={plan} source={sourceLocation} onSourceChange={setSourceLocation} onGenerate={refreshTravel}
              disabled={loading || refreshingDay !== null || refreshingPeriod !== null} busy={refreshingTravel} message={travelMessage} />)}
            <div className="mb-7"><BudgetTrackerPreview trip={{ ...plan, includeTravel, currency, budgetAmount, startDate, endDate }} userId={user?.uid} symbol={CURRENCIES[currency]?.symbol || '₹'} onDraftChange={patch => { setPlan(current => ({ ...current, ...patch })); setTripSaved(false); }} /></div>

            {plan.travelInfo && <JourneyTickets onSaveCost={saveJourneyCost} plan={plan} source={sourceLocation} onSourceChange={setSourceLocation} onGenerate={refreshTravel} busy={refreshingTravel} disabled={loading || refreshingDay !== null || refreshingPeriod !== null} message={travelMessage} />}


            <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-950">Day by day</h2><p className="mt-1 text-xs text-slate-500">Open a day to see activities, or refresh it for a different plan.</p></div>
              <button type="button" onClick={() => generatePlan({ refresh: true })} disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh entire itinerary'}</button>
            </div>
            {/* Days Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plan.days?.map((day, dayIndex) => (
                day.isDraftDay ? <BlankDayCard label={itineraryDayLabel(plan.days,day)} key={day.date} day={day} busy={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} onGenerate={() => refreshDay(dayIndex)} onSave={value => saveExtraDay(dayIndex, value)} /> : 
                <div
                  key={day.day}
                  onClick={() => { setSelectedDay(day); setStep('dayDetail'); }}
                  className={`bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all duration-200 group ${day.travelReservation ? 'travel-day-highlight' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-3 py-1 rounded-lg shadow-sm">{itineraryDayLabel(plan.days,day)}</span>
                    <div className="flex items-center gap-2"><span className="text-xs text-zinc-500">{formatDate(day.date)}</span><DayRefreshButton day={day} busy={refreshingDay === dayIndex} disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} onClick={() => refreshDay(dayIndex)} /></div>
                  </div>
                  
                  {day.travelReservation && <p className="mb-2 text-xs font-semibold text-blue-700">{day.travelReservation.journeyId === 'onward' ? 'Onward journey' : 'Return journey'} · transport fixed</p>}
                  <h3 className="font-medium text-zinc-900 mb-1.5 group-hover:text-zinc-700 transition-colors">{day.title}</h3>
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{day.summary}</p>
                  <TravelDayCost plan={plan} day={day} />
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-amber-100 rounded-lg text-amber-600">☀</span>
                      <span className="truncate">{travelActivityTitle(day, 'morning')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-lg text-blue-600">◐</span>
                      <span className="truncate">{travelActivityTitle(day, 'afternoon')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 rounded-lg text-indigo-600">☾</span>
                      <span className="truncate">{travelActivityTitle(day, 'evening')}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Est. cost</span>
                    <span className="text-sm font-semibold text-emerald-600">{day.estimatedCost || 'N/A'}</span>
                  </div>
                </div>
              ))}

              <button type="button" disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} onClick={addExtraDay} className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><span aria-hidden="true" className="text-3xl">+</span><span className="font-semibold">Add day</span><span className="text-xs text-slate-500">Extends the trip by one day; a reserved return shifts later.</span></button>            </div>

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
                            tripData: { ...plan, plannerDestination: destination, source: sourceLocation, currency, budgetAmount, includeHotels, includeTravel },
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

            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            <div role="status" className="sr-only">{refreshingPeriod ? `Refreshing ${refreshingPeriod} activity` : ''}</div>
            <p className="mb-4 text-xs leading-relaxed text-slate-500">{selectedDay.travelReservation ? 'This day is reserved for travel. Refresh changes only onboard suggestions; route, transport and dates stay fixed.' : 'Refreshing an activity also updates linked meals, transfers and activities when needed to keep the day consistent.'}</p>
            {/* Content */}
            {selectedDay.travelReservation ? <TravelDayActivities plan={plan} day={selectedDay} busy={refreshingDay !== null || refreshingPeriod !== null} onRefresh={period => refreshPeriod(period)} /> : (
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
                  <button type="button" aria-label="Refresh morning activity" onClick={() => refreshPeriod('morning')} disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    {refreshingPeriod === 'morning' ? 'Refreshing…' : '↻ Refresh'}
                  </button>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(selectedDay, 'morning')}</h5>
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
                  <button type="button" aria-label="Refresh afternoon activity" onClick={() => refreshPeriod('afternoon')} disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    {refreshingPeriod === 'afternoon' ? 'Refreshing…' : '↻ Refresh'}
                  </button>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(selectedDay, 'afternoon')}</h5>
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
                  <button type="button" aria-label="Refresh evening activity" onClick={() => refreshPeriod('evening')} disabled={loading || refreshingDay !== null || refreshingPeriod !== null || refreshingTravel} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    {refreshingPeriod === 'evening' ? 'Refreshing…' : '↻ Refresh'}
                  </button>
                </div>
                <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(selectedDay, 'evening')}</h5>
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
            </div>)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
