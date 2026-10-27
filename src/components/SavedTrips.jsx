import LazyCard from './LazyCard';
import LoadingSpinner from './LoadingSpinner';
import { itineraryDayLabel } from '../utils/dayLabels';
import { Trash2 } from 'lucide-react';
import SavedTripsSummary from './SavedTripsSummary';
import PlanBudgetWarning from './PlanBudgetWarning';
import TravelDayCost from './TravelDayCost';
import DayRefreshButton from './DayRefreshButton';
import BlankDayCard from './BlankDayCard';
import { extendTrip } from '../utils/extendTrip';
import JourneyTickets from './JourneyTickets';
import { applyJourneyLeg, removeJourney } from '../utils/journeyLegs';
import { readPlanningResponse } from '../utils/planningResponse';
import TravelDayActivities from './TravelDayActivities';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { savedTripPath } from '../utils/tripNavigation';
import { auth, db } from '../Firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from '../Firebase';
import Navbar from './Navbar';
import ChosenStay from './ChosenStay';
import BudgetTrackerPreview from './BudgetTrackerPreview';
import TripHeader from './TripHeader';
import EditableEstimate from './EditableEstimate';
import DayCostEstimate from './DayCostEstimate';
import JourneyDirections from './JourneyDirections';
import { requestTravelInfo } from '../utils/travelInfo';
import { travelActivityTitle, reserveTravelDays, refreshOnboardDay, attachTravelDirections } from '../utils/travelSchedule';
import { isUsableTripPlan, replaceTripDay, periodRefreshPrompt, applyPeriodRefresh } from '../utils/tripPlan';
import { tripBudgetSummary, budgetOnlyPatch, parseEstimatedCost } from '../utils/tripBudget';

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
      use_cache: false,
      provider: LLM_PROVIDER
    })
  });

  return readPlanningResponse(response);
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

function BudgetComparison({ trip, budget }) {
  const summary = tripBudgetSummary(trip, budget);
  const symbol = CURRENCIES[trip.currency]?.symbol || '₹';
  return <div aria-live="polite" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
    <div className="flex justify-between gap-3"><span>Recorded plan estimate</span><strong>{symbol}{summary.estimate.toLocaleString()}</strong></div>
    {summary.available && Number(budget) > 0 ? <div className={`mt-2 flex justify-between gap-3 font-semibold ${summary.balance < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
      <span>{summary.balance < 0 ? 'Over budget by' : 'Estimated remaining'}</span><span>{symbol}{Math.abs(summary.balance).toLocaleString()}</span>
    </div> : <p className="mt-2 text-xs text-amber-700">{(summary.missingDays || summary.missingTravel) ? 'Some day or transport costs are missing. A reliable remaining amount cannot be calculated yet.' : 'Set a budget to see the estimated remaining amount.'}</p>}
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Based on stored day estimates and separately recorded onward and return costs. Lodging, transfers and other unrecorded costs may be extra. This is not actual spending.</p>
  </div>;
}

export default function SavedTrips() {
  const returnLocation=useLocation();
  const [trips, setTrips] = useState([]);
  const [journeyEditorOpen, setJourneyEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  useEffect(()=>{
    const scroll=returnLocation.state?.restoreChecklistScroll;
    if(typeof scroll!=='number'||loading||(returnLocation.search.includes('trip=')&&!selectedTrip))return;
    const frame=requestAnimationFrame(()=>window.scrollTo({top:scroll,behavior:'instant'}));
    return()=>cancelAnimationFrame(frame);
  },[loading,selectedTrip?.id,returnLocation.key]);
  const [editMode, setEditMode] = useState(false);
  const [editedDay, setEditedDay] = useState(null);
  const [showBudgetEditModal, setShowBudgetEditModal] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [refreshTarget, setRefreshTarget] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [travelMessage, setTravelMessage] = useState('');
  const [travelSource, setTravelSource] = useState('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTripId = searchParams.get('trip');

  // The URL preserves the open trip across route changes and browser history.
  useEffect(() => {
    setSelectedTrip(selectedTripId ? trips.find(trip => trip.id === selectedTripId) || null : null);
  }, [selectedTripId, trips]);

  useEffect(() => {
    setSelectedDay(null);
    setEditMode(false);
    setShowBudgetEditModal(false);
    setActionError(null);
    setTravelMessage('');
    setTravelSource('');
  }, [selectedTripId]);

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
      setSearchParams({}, { replace: true });
      setSelectedTrip(null);
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Failed to delete trip');
    }
  };

  const saveEditedDay = async () => {
    if (!selectedTrip || !editedDay) return;
    if (selectedDay?.travelReservation) { setActionError('Journey dates and transport are fixed. Use onboard refresh instead.'); return; }

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

  const saveBudgetOnly = async () => {
    const amount = Number(newBudget);
    if (!selectedTrip || !user || !Number.isFinite(amount) || amount <= 0 || regenerating) return;
    setRegenerating(true);
    setActionError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'trips', selectedTrip.id), { ...budgetOnlyPatch(amount), updatedAt: new Date() });
      setSelectedTrip(current => ({ ...current, ...budgetOnlyPatch(amount) }));
      setShowBudgetEditModal(false);
    } catch (err) { setActionError('Could not save the budget. Your trip has been kept.'); }
    finally { setRegenerating(false); }
  };

  const saveJourneyCost = async (direction, costEstimate) => {
    if (refreshTarget || regenerating) return;
    setRefreshTarget('cost');
    try {
      const travelInfo = direction === 'return' ? {...selectedTrip.travelInfo,returnJourney:{...selectedTrip.travelInfo.returnJourney,costEstimate}} : {...selectedTrip.travelInfo,costEstimate};
      await updateDoc(doc(db,'users',user.uid,'trips',selectedTrip.id),{travelInfo,totalBudget:null,budgetWarning:null,updatedAt:new Date()});
      setSelectedTrip({...selectedTrip,travelInfo,totalBudget:null,budgetWarning:null});
    } finally {setRefreshTarget(null);}
  };
  const addExtraDay = async () => {
    if (!selectedTrip || !user || regenerating || refreshTarget) return;
    setRefreshTarget('extend'); setActionError(null);
    try {
      const {plan: updated} = extendTrip(selectedTrip);
      await updateDoc(doc(db,'users',user.uid,'trips',selectedTrip.id), { days:updated.days, endDate:updated.endDate, travelSchedule:updated.travelSchedule || null, totalBudget:null,budgetWarning:null,updatedAt:new Date() });
      setSelectedTrip(updated);
    } catch(err) { setActionError(err.message); } finally { setRefreshTarget(null); }
  };
  const saveExtraDay = async (index, day) => {
    if (regenerating || refreshTarget) return;
    setRefreshTarget('manual'); setActionError(null);
    try {
      const updated=replaceTripDay(selectedTrip,index,day);
      await updateDoc(doc(db,'users',user.uid,'trips',selectedTrip.id), {days:updated.days,totalBudget:null,budgetWarning:null,updatedAt:new Date()});
      setSelectedTrip(updated);
    } catch(err) { setActionError(err.message); } finally { setRefreshTarget(null); }
  };
  const removeSavedJourney=async direction=>{
    if(!user||!selectedTrip||regenerating||refreshTarget)return;
    if(!confirm(`Remove the ${direction} journey, its cost and its travel-day cards?`))return;
    setRefreshTarget('travel');setActionError(null);
    try{const updated=removeJourney(selectedTrip,direction);await updateDoc(doc(db,'users',user.uid,'trips',selectedTrip.id),{removedJourneys:updated.removedJourneys,travelInfo:updated.travelInfo,days:updated.days,travelSchedule:updated.travelSchedule,totalBudget:null,budgetWarning:null,updatedAt:new Date()});setSelectedTrip(updated);setSelectedDay(null);}
    catch{setActionError('Could not remove the journey. Please retry.');}
    finally{setRefreshTarget(null);}
  };
  const saveDayEstimate=async(day,period,amount)=>{
    if(!user||!selectedTrip||refreshTarget||regenerating)throw new Error('Wait for the current update to finish.');
    const index=selectedTrip.days.findIndex(item=>item.day===day.day&&item.date===day.date);
    if(index<0||day.travelReservation)throw new Error('This day cannot be edited here.');
    setRefreshTarget('cost');
    try{
      let replacement;
      if(period){
        replacement={...day,estimateCleared:false,[period]:{...day[period],estimatedCost:amount}};
        const previous=parseEstimatedCost(day[period]?.estimatedCost),total=parseEstimatedCost(day.estimatedCost);
        const parts=['morning','afternoon','evening'].map(key=>parseEstimatedCost(replacement[key]?.estimatedCost));
        replacement.estimatedCost=total!==null&&previous!==null?Math.max(0,total-previous+amount):parts.every(n=>n!==null)?parts.reduce((a,b)=>a+b,0):null;
        if(replacement.costs)replacement.costs=null;
      }else{
        const text=await callAI('openai/gpt-oss-20b',`Replan one destination day in ${selectedTrip.actualDestination||selectedTrip.destination} within a strict TOTAL day budget of ${amount} ${selectedTrip.currency||'INR'}. Existing day: ${JSON.stringify(day)}. Keep date and arrival/departure obligations. Choose cheaper real activities if needed. Return JSON with days containing exactly one day with title, summary, morning, afternoon, evening (activity, description, location, duration, numeric estimatedCost), and numeric estimatedCost for the entire day including meals and local transport. Do not invent cheap prices to force the budget. If infeasible, return the realistic minimum estimatedCost.`,4000);
        const result=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
        replacement=result.days?.[0];
        const estimate=parseEstimatedCost(replacement?.estimatedCost);
        if(!isUsableTripPlan(result)||result.days.length!==1||estimate===null)throw new Error('The proposed day is incomplete. Your current plan was kept.');
        if(estimate>amount)throw new Error(`The proposed plan exceeds your target by ${selectedTrip.currency||'INR'} ${(estimate-amount).toLocaleString()} (estimated total ${estimate.toLocaleString()}). Your current plan was kept.`);
        replacement={...replacement,targetBudget:amount};
      }
      const updated=replaceTripDay(selectedTrip,index,replacement);
      await updateDoc(doc(db,'users',user.uid,'trips',selectedTrip.id),{days:updated.days,totalBudget:null,budgetWarning:null,updatedAt:new Date()});
      setSelectedTrip(updated);setSelectedDay(updated.days[index]);
    }finally{setRefreshTarget(null);}
  };
  const refreshSaved = async (dayIndex, period = null) => {
    if (regenerating || refreshTarget || editMode) return;
    setRefreshTarget(period || `day-${dayIndex}`);
    setActionError(null);
    const original = selectedTrip;
    const day = original.days[dayIndex];
    try {
      if (day.travelReservation) {
        const updated = refreshOnboardDay(original, dayIndex, period);
        await updateDoc(doc(db, 'users', user.uid, 'trips', original.id), { days: updated.days, updatedAt: new Date() });
        setSelectedTrip(updated);
        setSelectedDay(current => current?.day === day.day ? updated.days[dayIndex] : current);
        return;
      }
      const prompt = period
        ? periodRefreshPrompt(original, dayIndex, period)
        : `Replace this day with a different complete itinerary in ${original.actualDestination || original.destination}: ${JSON.stringify(day)}. Return ONLY JSON with a days array containing exactly one day, with title, summary and morning/afternoon/evening objects, each with activity, description, location, duration, estimatedCost. Include day estimatedCost and preserve hotel/meals fields if present. Keep arrival/departure obligations.`;
      const text = await callAI('openai/gpt-oss-20b', `${prompt} Currency: ${original.currency || 'INR'}. Entire trip budget: ${original.budgetAmount || 'flexible'}. Avoid duplicating these other activities: ${JSON.stringify(original.days.filter((_, i) => i !== dayIndex))}. Costs are unverified estimates.`, 4000);
      const result = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
      if (!period && (!isUsableTripPlan(result) || result.days.length !== 1)) throw new Error('Incomplete replacement day');
      const updated = period ? applyPeriodRefresh(original, dayIndex, result) : replaceTripDay(original, dayIndex, result.days[0]);
      await updateDoc(doc(db, 'users', user.uid, 'trips', original.id), { days: updated.days, totalBudget: null, budgetWarning: null, updatedAt: new Date() });
      setSelectedTrip(updated);
      setSelectedDay(current => current?.day === day.day && current?.date === day.date ? updated.days[dayIndex] : current);
    } catch (err) { setActionError(err.message || 'Could not refresh. Your saved plan has been kept.'); }
    finally { setRefreshTarget(null); }
  };

  const addSavedDirections = async (mode = '', direction = 'onward') => {
    if (!selectedTrip || !user || regenerating || refreshTarget) return;
    const original = selectedTrip;
    const source = travelSource || original.source || original.travelInfo?.from || '';
    setRefreshTarget('travel');
    setTravelMessage('');
    try {
      const destination = original.actualDestination || original.destination;
      const leg = await requestTravelInfo(callAI, direction === 'return' ? destination : source, direction === 'return' ? source : destination, original.currency || 'INR', mode);
      const info = applyJourneyLeg(original, leg, direction);
      const result = attachTravelDirections(original, info, source);
      if (mode && !result.plan.travelSchedule) throw new Error(result.notice);
      await updateDoc(doc(db, 'users', user.uid, 'trips', original.id), {
        travelInfo: info, source, includeTravel: true, days: result.plan.days,
        travelSchedule: result.plan.travelSchedule || null, totalBudget: null, budgetWarning: null, updatedAt: new Date()
      });
      setSelectedTrip(result.plan);
      setTravelMessage(result.notice || 'Directions saved to this trip. Travel days are reserved in the calendar.');
    } catch (err) { setTravelMessage(err.message || 'Could not save directions. Your saved itinerary has been kept.'); }
    finally { setRefreshTarget(null); }
  };

  const reserveSavedTravel = async () => {
    if (regenerating || refreshTarget) return;
    setRegenerating(true);
    setActionError(null);
    try {
      const updated = reserveTravelDays(selectedTrip);
      await updateDoc(doc(db, 'users', user.uid, 'trips', selectedTrip.id), { days: updated.days, travelSchedule: updated.travelSchedule, totalBudget: null, budgetWarning: null, updatedAt: new Date() });
      setSelectedTrip(updated);
      setSelectedDay(null);
    } catch (err) { setActionError(err.message || 'Could not reserve travel days.'); }
    finally { setRegenerating(false); }
  };

  // Regenerate plan with new budget
  const regeneratePlanWithBudget = async (budgetOverride = null) => {
    if (!selectedTrip || regenerating || refreshTarget) return;
    
    const budgetNum = budgetOverride ?? Number(newBudget || selectedTrip.budgetAmount);
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

Every destination day must include a numeric estimatedCost in ${currency}, including food, local transport and activities. Include numeric estimatedCost in each activity too. Use zero for free activities. These are unverified planning estimates, not live quotes. Do not include onward/return fares in day totals.
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
      "estimatedCost": 0,
      "morning": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h", "estimatedCost": 0},
      "afternoon": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "3h", "estimatedCost": 0},
      "evening": {"activity": "Activity", "description": "Description", "location": "Place", "duration": "2h", "estimatedCost": 0},
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

        if (!isUsableTripPlan(planData) || planData.days.length !== numDays) throw new Error('The replacement itinerary is incomplete.');
        if(planData.days.some(day=>parseEstimatedCost(day.estimatedCost)===null))throw new Error('The replacement itinerary is missing daily cost estimates. Your saved plan has been kept. Please retry.');
        planData.startDate = startDate;
        planData.endDate = endDate;
        planData.days = planData.days.map((day, index) => ({ ...day, day: selectedTrip.days[index].day, date: selectedTrip.days[index].date }));
        planData.source = source;
        planData.includeTravel = selectedTrip.includeTravel !== false;
        if (planData.includeTravel) {
          planData.travelInfo = selectedTrip.travelInfo || planData.travelInfo;
          planData = reserveTravelDays(planData);
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
        <LoadingSpinner label="Loading your trips…"/>
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
      <div className="min-h-screen trip-page-background saved-trips-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-zinc-900">My Saved Trips</h1>
                <p className="text-zinc-500 text-sm mt-0.5">{trips.length} trip{trips.length !== 1 ? 's' : ''} saved</p>
              </div>
            </div>

            <SavedTripsSummary trips={trips} userId={user?.uid} />

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
                    onClick={() => navigate(savedTripPath(trip.id))}
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
                      <div className="flex shrink-0 items-center gap-2"><span className="bg-gradient-to-r from-zinc-100 to-zinc-50 text-zinc-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-zinc-200/60">
                        {trip.days?.length || 0} days
                      </span><button type="button" aria-label={`Delete trip to ${trip.destination || 'destination'}`} title="Delete trip" onClick={event=>{event.stopPropagation();deleteTrip(trip.id);}} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 size={17} aria-hidden="true"/></button></div>
                    </div>
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{trip.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                      <span className="text-sm font-semibold">{trip.budgetAmount ? `${CURRENCIES[trip.currency]?.symbol || '₹'}${Number(trip.budgetAmount).toLocaleString()}` : (trip.totalBudget || 'Budget not set')}</span>
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
        {(regenerating||refreshTarget)&&<div className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white px-5 py-3 shadow-xl"><LoadingSpinner compact label="Updating your itinerary…"/></div>}
        <Navbar onBack={() => { setSelectedDay(null); setEditMode(false); }} backLabel="Back to trip overview" />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/50 p-5 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm">{itineraryDayLabel(selectedTrip.days,day)}</span>
                      <span className="text-xs text-zinc-400">{formatDate(day.date)}</span>
                    </div>
                    <h1 className="text-lg font-semibold text-zinc-900">{day.title}</h1>
                  </div>
                </div>
                {!editMode ? (
                  <button 
                    disabled={Boolean(refreshTarget) || regenerating || Boolean(day.travelReservation)}
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

            {actionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
            {!editMode && <p className="mb-4 text-xs leading-relaxed text-slate-500">{day.travelReservation ? 'This is a reserved travel day. Refresh changes only onboard suggestions; the journey stays fixed.' : 'Activity refreshes also reconcile linked meals, transfers and activities before saving the revised day.'}</p>}
            {/* Content */}
            {day.travelReservation ? <TravelDayActivities plan={selectedTrip} day={day} busy={regenerating || Boolean(refreshTarget)} onRefresh={period => refreshSaved(selectedTrip.days.findIndex(item => item.day === day.day), period)} /> : (
            <div className="space-y-4">
              {/* Morning */}
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-2xl p-4 shadow-lg shadow-zinc-200/30 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-xl text-lg shadow-sm">☀</span>
                  <h4 className="font-medium text-zinc-900">Morning</h4>
                    {!editMode && <button type="button" aria-label="Refresh saved morning activity" disabled={regenerating || Boolean(refreshTarget)} onClick={() => refreshSaved(selectedTrip.days.findIndex(item => item.day === day.day), 'morning')} className="mt-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">{refreshTarget === 'morning' ? 'Refreshing…' : '↻ Refresh'}</button>}
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
                    <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(day, 'morning')}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.morning?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.morning?.location}
                    </p>
                    {day.morning?.estimatedCost !== undefined && day.morning?.estimatedCost !== null && (
                      <p className="text-xs text-emerald-600 font-medium">{day.morning.estimatedCost}</p>
                    )}
                    {!day.travelReservation&&<EditableEstimate value={day.morning?.estimatedCost} currency={selectedTrip.currency||'INR'} disabled={regenerating||Boolean(refreshTarget)} onSave={amount=>saveDayEstimate(day,'morning',amount)}/>}
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
                    {!editMode && <button type="button" aria-label="Refresh saved afternoon activity" disabled={regenerating || Boolean(refreshTarget)} onClick={() => refreshSaved(selectedTrip.days.findIndex(item => item.day === day.day), 'afternoon')} className="mt-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">{refreshTarget === 'afternoon' ? 'Refreshing…' : '↻ Refresh'}</button>}
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
                    <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(day, 'afternoon')}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.afternoon?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.afternoon?.location}
                    </p>
                    {day.afternoon?.estimatedCost !== undefined && day.afternoon?.estimatedCost !== null && (
                      <p className="text-xs text-emerald-600 font-medium">{day.afternoon.estimatedCost}</p>
                    )}
                    {!day.travelReservation&&<EditableEstimate value={day.afternoon?.estimatedCost} currency={selectedTrip.currency||'INR'} disabled={regenerating||Boolean(refreshTarget)} onSave={amount=>saveDayEstimate(day,'afternoon',amount)}/>}
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
                    {!editMode && <button type="button" aria-label="Refresh saved evening activity" disabled={regenerating || Boolean(refreshTarget)} onClick={() => refreshSaved(selectedTrip.days.findIndex(item => item.day === day.day), 'evening')} className="mt-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">{refreshTarget === 'evening' ? 'Refreshing…' : '↻ Refresh'}</button>}
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
                    <h5 className="font-medium text-zinc-800 mb-1">{travelActivityTitle(day, 'evening')}</h5>
                    <p className="text-sm text-zinc-500 mb-2">{day.evening?.description}</p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {day.evening?.location}
                    </p>
                    {day.evening?.estimatedCost !== undefined && day.evening?.estimatedCost !== null && (
                      <p className="text-xs text-emerald-600 font-medium">{day.evening.estimatedCost}</p>
                    )}
                    {!day.travelReservation&&<EditableEstimate value={day.evening?.estimatedCost} currency={selectedTrip.currency||'INR'} disabled={regenerating||Boolean(refreshTarget)} onSave={amount=>saveDayEstimate(day,'evening',amount)}/>}
                  </>
                )}
              </div>

              {/* Cost breakdown */}
              {day.costs && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center shadow-lg mb-4">
                  <span className="block mb-2 font-medium">Cost Breakdown for {itineraryDayLabel(selectedTrip.days,day)}</span>
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
                <span className="text-xs text-emerald-100 font-medium uppercase tracking-wide">Estimated Cost for {itineraryDayLabel(selectedTrip.days,day)}</span>
                {editMode ? (
                  <input
                    value={editedDay.estimatedCost || ''}
                    onChange={(e) => setEditedDay({ ...editedDay, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-center text-xl font-semibold mt-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent shadow-lg"
                  />
                ) : (
                  <><p className="text-3xl font-bold mt-1">{typeof day.estimatedCost==='number'?`${selectedTrip.currency||'INR'} ${day.estimatedCost.toLocaleString()}`:day.estimatedCost||'Not estimated'}</p>{!day.travelReservation&&<EditableEstimate target value={day.estimatedCost} currency={selectedTrip.currency||'INR'} disabled={regenerating||Boolean(refreshTarget)} onSave={amount=>saveDayEstimate(day,null,amount)}/>}</>
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
            </div>)}
          </div>
        </div>
      </div>
    );
  }

  // Trip Calendar View
  return (
    <div className="min-h-screen trip-page-background itinerary-background">
      {(regenerating||refreshTarget)&&<div className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white px-5 py-3 shadow-xl"><LoadingSpinner compact label="Updating your itinerary…"/></div>}
      <Navbar onBack={() => setSearchParams({})} backLabel="Back to saved trips" />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <TripHeader saved destination={selectedTrip.actualDestination || selectedTrip.destination} source={selectedTrip.source}
            summary={selectedTrip.summary} startDate={selectedTrip.startDate} endDate={selectedTrip.endDate} dayCount={selectedTrip.days?.length}
            budget={selectedTrip.budgetAmount} currency={selectedTrip.currency} symbol={CURRENCIES[selectedTrip.currency]?.symbol || '₹'}>
            <button type="button" onClick={() => { setNewBudget(selectedTrip.budgetAmount?.toString() || ''); setActionError(null); setShowBudgetEditModal(true); }}>Edit budget</button>
            <button type="button" disabled={regenerating || Boolean(refreshTarget)} onClick={() => regeneratePlanWithBudget(Number(selectedTrip.budgetAmount))}>{regenerating ? 'Refreshing…' : 'Refresh entire itinerary'}</button>
            <button type="button" onClick={() => navigate(`/budget/${selectedTrip.id}`)}>Track budget</button>
            <button type="button" onClick={() => navigate('/hotels', { state: { tripData: selectedTrip, fromPage: 'saved-trips' } })}>Find stays</button>
            <button type="button" onClick={() => navigate(`/Todolist?trip=${encodeURIComponent(selectedTrip.id)}`,{state:{checklistOrigin:{path:returnLocation.pathname+returnLocation.search,scrollY:window.scrollY}}})}>Trip checklist</button>
            <button type="button" data-variant="danger" onClick={() => deleteTrip(selectedTrip.id)}>Delete</button>
          {!selectedTrip.travelInfo && <button type="button" aria-expanded={journeyEditorOpen} onClick={() => setJourneyEditorOpen(value => !value)}>How to get there</button>}
            </TripHeader>
            <PlanBudgetWarning plan={selectedTrip} budget={selectedTrip.budgetAmount} symbol={CURRENCIES[selectedTrip.currency]?.symbol || '₹'} />
            {!selectedTrip.travelInfo && journeyEditorOpen && (<JourneyDirections plan={selectedTrip} source={travelSource || selectedTrip.source || selectedTrip.travelInfo?.from || ''}
            onSourceChange={setTravelSource} onGenerate={addSavedDirections} busy={refreshTarget === 'travel'}
            disabled={regenerating || Boolean(refreshTarget)} message={travelMessage} />)}

          <ChosenStay trip={selectedTrip} userId={user?.uid} tripId={selectedTrip.id} onBrowse={() => navigate('/hotels?saved=1', { state: { tripData: selectedTrip, fromPage: 'saved-trips' } })} />

          {selectedTrip.travelInfo && <JourneyTickets onRemove={removeSavedJourney} onSaveCost={saveJourneyCost} plan={selectedTrip} source={travelSource || selectedTrip.source || selectedTrip.travelInfo?.from || ''} onSourceChange={setTravelSource} onGenerate={addSavedDirections} busy={refreshTarget === 'travel'} disabled={regenerating || Boolean(refreshTarget)} message={travelMessage} />}

          {actionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
          <div className="mb-5 space-y-3">
            <BudgetTrackerPreview key={selectedTrip.id} trip={selectedTrip} userId={user?.uid} symbol={CURRENCIES[selectedTrip.currency]?.symbol || '₹'} />
            
          </div>
          {/* Days Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTrip.days?.map((day, dayIndex) => (
              <LazyCard key={day.date||day.day} eager={dayIndex<3} label={`Loading ${itineraryDayLabel(selectedTrip.days,day).toLowerCase()}…`}>{
                day.isDraftDay ? <BlankDayCard label={itineraryDayLabel(selectedTrip.days,day)} key={day.date} day={day} busy={regenerating || Boolean(refreshTarget)} onGenerate={() => refreshSaved(dayIndex)} onSave={value => saveExtraDay(dayIndex, value)} /> : 
              <div
                key={day.day}
                onClick={() => setSelectedDay(day)}
                className={`itinerary-preview-card backdrop-blur-sm border rounded-2xl p-3 sm:p-4 cursor-pointer hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 ${day.travelReservation?'bg-yellow-50 border-yellow-300 shadow-md shadow-yellow-100/60':'bg-white/80 border-zinc-200/60 hover:border-zinc-300 hover:shadow-zinc-200/50'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium px-3 py-1 rounded-lg shadow-sm">{itineraryDayLabel(selectedTrip.days,day)}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-zinc-400">{formatDate(day.date)}</span><DayRefreshButton day={day} busy={refreshTarget === `day-${dayIndex}`} disabled={regenerating || Boolean(refreshTarget)} onClick={() => refreshSaved(dayIndex)} /></div>
                </div>
                
                {day.travelReservation && <p className="mb-1 text-[11px] sm:mb-2 sm:text-xs font-semibold text-blue-700">{day.travelReservation.journeyId === 'onward' ? 'Onward journey' : 'Return journey'} · transport fixed</p>}
                <h3 className="text-sm sm:text-base font-medium text-zinc-900 mb-1 group-hover:text-zinc-700 transition-colors">{day.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-500 mb-2 sm:mb-3 line-clamp-2">{day.summary}</p>
                <TravelDayCost plan={selectedTrip} day={day} />
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg text-amber-600 shadow-sm">☀</span>
                    <span className="truncate">{travelActivityTitle(day, 'morning')}</span>
                    {day.morning?.coordinates && (
                      <span className="ml-2 text-[10px] text-blue-500">[{day.morning.coordinates.lat}, {day.morning.coordinates.lng}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-blue-600 shadow-sm">◐</span>
                    <span className="truncate">{travelActivityTitle(day, 'afternoon')}</span>
                    {day.afternoon?.coordinates && (
                      <span className="ml-2 text-[10px] text-blue-500">[{day.afternoon.coordinates.lat}, {day.afternoon.coordinates.lng}]</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg text-indigo-600 shadow-sm">☾</span>
                    <span className="truncate">{travelActivityTitle(day, 'evening')}</span>
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
                <DayCostEstimate day={day} currency={selectedTrip.currency || 'INR'} />
                <div className="hidden sm:block mt-2 text-center">
                  <span className="text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view/edit
                  </span>
                </div>
              </div>
              }</LazyCard>
            ))}

              <button type="button" disabled={regenerating || Boolean(refreshTarget)} onClick={addExtraDay} className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><span aria-hidden="true" className="text-3xl">+</span><span className="font-semibold">Add day</span><span className="text-xs text-slate-500">Extends the trip by one day; a reserved return shifts later.</span></button>          </div>

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
          <div role="dialog" aria-modal="true" aria-label="Edit budget" className="bg-white rounded-2xl shadow-2xl max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Edit Budget</h3>
                <p className="text-sm text-zinc-500">See your balance and keep your itinerary</p>
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
                    ? `↑ Budget increased by ${CURRENCIES[selectedTrip.currency]?.symbol}${(parseFloat(newBudget) - selectedTrip.budgetAmount).toLocaleString()}`
                    : parseFloat(newBudget) < selectedTrip.budgetAmount
                    ? `↓ Budget decreased by ${CURRENCIES[selectedTrip.currency]?.symbol}${(selectedTrip.budgetAmount - parseFloat(newBudget)).toLocaleString()}`
                    : ''}
                </p>
              )}
            </div>

            <div className="mb-4"><BudgetComparison trip={selectedTrip} budget={newBudget} /></div>
            {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-lg">💡</span>
                <p className="text-xs text-blue-700">
                  Saving changes only your budget. Your itinerary stays as it is. Use the separate refresh controls if you want different recommendations.
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
                onClick={saveBudgetOnly}
                disabled={regenerating || Boolean(refreshTarget) || !newBudget || Number(newBudget) <= 0 || Number(newBudget) === Number(selectedTrip.budgetAmount)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {regenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save budget
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
