import ManualStay from './ManualStay';
import ManualJourneys from './ManualJourneys';
import { aiFetch } from '../utils/aiFetch';
import { DeviceDayGrid, DeviceDayDetail } from './DeviceItinerary';
import JourneyTickets from './JourneyTickets';
import JourneyDirections from './JourneyDirections';
import { applyJourneyLeg, removeJourney } from '../utils/journeyLegs';
import { attachTravelDirections } from '../utils/travelSchedule';
import { requestTravelInfo } from '../utils/travelInfo';
import { readPlanningResponse } from '../utils/planningResponse';
import { API_BASE } from '../utils/apiBase';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import TripHeader from './TripHeader';
import MobileAccordion from './ui/mobile-accordion';
import LoadingSpinner from './LoadingSpinner';
import BudgetTrackerPreview from './BudgetTrackerPreview';
import { deleteGuestTrip, GUEST_TRIPS_CHANGED, listGuestTrips, saveGuestTrip } from '../utils/guestTrips';

export default function GuestSavedTrips() {
  const navigate = useNavigate();
  const [dayIndex, setDayIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const [travelMessage, setTravelMessage] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const trip = trips.find(item => item.id === params.get('trip'));
  useEffect(() => { setDayIndex(null); setTravelMessage(''); }, [params.get('trip')]);
  useEffect(() => {
    let active = true;
    const load = () => listGuestTrips().then(items => { if (active) setTrips(items); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    load(); window.addEventListener(GUEST_TRIPS_CHANGED, load);
    return () => { active = false; window.removeEventListener(GUEST_TRIPS_CHANGED, load); };
  }, []);
  const patch = async changes => {
    const updated = { ...trip, ...changes };
    setTrips(current => current.map(item => item.id === trip.id ? updated : item));
    try { await saveGuestTrip(updated); setError(''); }
    catch (err) { setTrips(current => current.map(item => item.id === trip.id ? trip : item)); setError(err.message); throw err; }
  };
  const updateJourney = async (mode = '', direction = 'onward') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const destination = trip.actualDestination || trip.destination;
      const callAI = async (model, prompt, maxTokens) => readPlanningResponse(await aiFetch(`${API_BASE}/api/completions`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],max_tokens:maxTokens,provider:'groq',use_cache:false})}));
      const leg = await requestTravelInfo(callAI, direction === 'return' ? destination : trip.source, direction === 'return' ? trip.source : destination, trip.currency || 'INR', mode);
      const travelInfo = applyJourneyLeg(trip,leg,direction);
      const result = attachTravelDirections({...trip,removedJourneys:(trip.removedJourneys || []).filter(item=>item!==direction)},travelInfo,trip.source);
      await patch(result.plan); setTravelMessage(result.notice || 'Journey saved on this device.');
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  };
  const saveFare = async (direction, costEstimate) => {
    await patch({travelInfo:direction === 'return' ? {...trip.travelInfo,returnJourney:{...trip.travelInfo.returnJourney,costEstimate}} : {...trip.travelInfo,costEstimate},totalBudget:null,budgetWarning:null});
  };
  if (trip && dayIndex !== null && trip.days?.[dayIndex]) return <div className="min-h-screen trip-page-background"><Navbar onBack={() => setDayIndex(null)} backLabel="Back to trip overview"/><main className="px-4 pb-32 pt-24"><DeviceDayDetail trip={trip} index={dayIndex} onBack={() => {setDayIndex(null);window.scrollTo(0,0);}}/></main></div>;
  return <div className={`min-h-screen trip-page-background ${trip ? 'itinerary-background' : 'saved-trips-background'}`}><Navbar/><main className="mx-auto max-w-5xl px-4 pb-32 pt-24">
    <p className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">Saved on this device only. Clearing browser data may remove these trips. <Link className="font-semibold text-blue-700 underline" to="/login">Sign in to back them up</Link>.</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {loading ? <LoadingSpinner label="Opening device trips…"/> : trip ? <>
      <Link to="/saved-trips?device=1" className="mb-4 inline-block text-sm text-blue-700">← All device trips</Link>
      <TripHeader saved destination={trip.actualDestination || trip.destination} source={trip.source} summary={trip.summary} startDate={trip.startDate} endDate={trip.endDate} dayCount={trip.days?.length} budget={trip.budgetAmount} currency={trip.currency} symbol={trip.currency === 'INR' ? '₹' : `${trip.currency} `}>
        <button onClick={() => navigate(`/plan-trip?destination=${encodeURIComponent(trip.destination)}`, {state:{resumePlan:trip}})}>Edit trip</button>
        <button onClick={() => navigate(`/Todolist?trip=${encodeURIComponent(trip.id)}`)}>Trip checklist</button>
        <button data-variant="danger" onClick={async () => { if (!confirm('Delete this trip from this device?')) return; try { await deleteGuestTrip(trip.id); setParams({device: '1'}); } catch (err) { setError(err.message); } }}>Delete trip</button>
      </TripHeader>
      <MobileAccordion title="Your stay" summary="Accommodation details and notes"><ManualStay plan={trip} onChange={patch}/></MobileAccordion>
      <MobileAccordion title="Your journeys" summary="Routes, transport and fares"><ManualJourneys plan={trip} onChange={patch}/></MobileAccordion>
      <MobileAccordion title="Budget tracker" summary="Estimates and costs saved on this device"><div className="mb-5"><BudgetTrackerPreview trip={trip} deviceSaved symbol={trip.currency === 'INR' ? '₹' : `${trip.currency} `} onDraftChange={patch}/></div></MobileAccordion>
      <MobileAccordion title="Day-by-day itinerary" summary={`${trip.days?.length || 0} cards · Activities and travel days`}><DeviceDayGrid trip={trip} onOpen={index=>{setDayIndex(index);window.scrollTo(0,0);}}/></MobileAccordion>

    </> : <><h1 className="mb-2 text-2xl font-bold">My device trips</h1><p className="mb-6 text-sm text-slate-500">{trips.length} trips saved in this browser</p>{params.get('trip') && <p role="status" className="mb-4">This trip isn’t saved in this browser. Sign in to access account trips.</p>}<div className="grid gap-4 sm:grid-cols-2">{trips.map(item => <Link key={item.id} to={`/saved-trips?device=1&trip=${encodeURIComponent(item.id)}`} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{item.actualDestination || item.destination}</h2><p className="mt-2 text-sm text-slate-500">{item.startDate} – {item.endDate}</p><p className="mt-2 text-sm text-slate-500">{item.summary}</p></Link>)}</div>{!trips.length && <Link className="mt-4 inline-block text-blue-700 underline" to="/home">Plan your first trip</Link>}</>}
  </main></div>;
}
