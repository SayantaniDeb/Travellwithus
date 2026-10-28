import { ChevronDown, Check } from 'lucide-react';
import BackButton from './BackButton';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db, onAuthStateChanged } from '../Firebase';
import Navbar from './Navbar';
import { changeChosenStay, toggleSavedStay, stayGroup, linkStayToTrip } from '../utils/savedStays';

export default function Shortlist({ embedded = false, onBrowse, onRemoved, tripId, trip }) {
  const [user, setUser] = useState(null), [data, setData] = useState({}), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  useEffect(() => {
    setTrips([]);
    if (!user) return;
    return onSnapshot(collection(db, 'users', user.uid, 'trips'), snapshot => setTrips(snapshot.docs.map(record => ({ ...record.data(), id: record.id }))), () => setError('Could not load trips for grouping.'));
  }, [user]);
  const assign = async (hotel, id) => {
    const target = trips.find(item => item.id === id);
    if (!target) return;
    setBusy(true); setError('');
    try { await linkStayToTrip(user.uid, hotel, target, false); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); if (!current) { setData({}); setLoading(false); } }), []);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'user_shortlists', user.uid), snapshot => { setData(snapshot.data() || {}); setLoading(false); }, () => { setError('Could not load saved hotels.'); setLoading(false); });
  }, [user]);
  const groups = Object.entries((data.hotelDetails || []).reduce((result, hotel) => { const key = stayGroup(hotel); (result[key] ||= []).push(hotel); return result; }, {})).sort(([a], [b]) => a === tripId ? -1 : b === tripId ? 1 : a.localeCompare(b));
  const act = async (hotel, action) => {
    setBusy(true); setError('');
    try { if (action === 'remove') { await toggleSavedStay(user.uid, hotel); onRemoved?.(hotel.id); } else if (action === 'choose' && !hotel.tripId && trip?.id) await linkStayToTrip(user.uid, hotel, trip); else await changeChosenStay(user.uid, hotel, action === 'unchoose'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className={embedded ? '' : 'min-h-screen bg-slate-50'}>{!embedded && <Navbar />}<div className={embedded ? 'space-y-5 py-4' : 'mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-24'}><h2 className="text-2xl font-bold">Saved stays</h2><p className="text-sm text-slate-600">Assign older favorites to their saved trip below. Hotels saved from a trip are grouped automatically. Choose one tentative stay per trip; unchoose it to switch.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{loading ? <p>Loading saved stays…</p> : !user ? <button onClick={() => navigate('/login')}>Sign in to view saved hotels</button> : groups.length === 0 ? <p>No hotels saved yet.</p> : groups.map(([group, hotels]) => <details key={group} className="saved-stays-group group rounded-2xl border border-slate-200 bg-slate-50"><summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden"><div className="min-w-0"><h3 className="break-words text-sm font-semibold sm:text-base">{group === 'general' ? 'Hotels not linked to a trip' : hotels[0].tripName || 'Saved trip'}</h3>{hotels[0].tripDates && <p className="mt-1 text-xs text-slate-500">{hotels[0].tripDates}</p>}<div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{hotels.length} saved {hotels.length === 1 ? 'stay' : 'stays'}</span>{data.chosenStays?.[group] && <span className="chosen-stay-badge inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><Check size={12} aria-hidden="true"/>Stay chosen</span>}</div></div><ChevronDown aria-hidden="true" size={18} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"/></summary><div className="space-y-3 border-t border-slate-200 p-3 sm:p-4">{group !== 'general' && <button className="inline-flex min-h-10 items-center text-xs font-semibold text-blue-700" onClick={() => navigate(`/saved-trips?trip=${encodeURIComponent(group)}`)}>View trip ↗</button>}{hotels.map(hotel => {
    const chosen = group === 'general' ? null : data.chosenStays?.[group]; const selected = chosen?.id === hotel.id || (!hotel.tripId && data.chosenStays?.general?.id === hotel.id);
    return <article key={hotel.id} className={`rounded-xl border bg-white p-4 ${selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}><h4 className="font-semibold">{hotel.name}</h4><p className="mt-1 text-sm text-slate-600">{hotel.location} · {hotel.price}</p>{!hotel.tripId && <label className="mt-3 block text-xs font-semibold text-slate-600">Assign to a saved trip<select aria-label={`Assign ${hotel.name} to a trip`} value="" disabled={busy} onChange={event => assign(hotel, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"><option value="">Select a trip…</option>{trips.map(item => <option key={item.id} value={item.id}>{item.actualDestination || item.destination} · {item.startDate || 'No date'} – {item.endDate || ''}</option>)}</select><span className="mt-1 block font-normal">{trips.length ? 'This hotel will move into its own trip group. An existing choice will be kept.' : 'Save an itinerary first to group this hotel.'}</span></label>}{selected && <p className="mt-2 text-sm font-semibold text-blue-700">Chosen stay · not booked</p>}<div className="mt-3 flex flex-wrap gap-3"><button disabled={busy || (!hotel.tripId && !selected) || (!!chosen && !selected)} onClick={() => act(hotel, selected ? 'unchoose' : 'choose')} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">{selected ? 'Unchoose' : !hotel.tripId ? 'Assign a trip to choose' : chosen ? 'Unchoose current stay first' : 'Choose stay'}</button><button disabled={busy || selected} onClick={() => act(hotel, 'remove')} className="px-3 py-2 text-sm text-red-700 disabled:opacity-40">Remove favorite</button></div></article>;
  })}</div></details>)}<BackButton onClick={() => onBrowse ? onBrowse() : navigate('/hotels')}>Back to hotel search</BackButton></div></div>;
}
