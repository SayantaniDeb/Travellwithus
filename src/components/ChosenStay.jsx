import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../Firebase';
import { changeChosenStay, linkStayToTrip } from '../utils/savedStays';

export default function ChosenStay({ userId, tripId, trip, onBrowse }) {
  const [hotel, setHotel] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [unlinked, setUnlinked] = useState(null);
  useEffect(() => {
    setHotel(null);
    if (!userId || !tripId) return;
    return onSnapshot(doc(db, 'user_shortlists', userId), snapshot => { setHotel(snapshot.data()?.chosenStays?.[tripId] || null); setUnlinked(snapshot.data()?.chosenStays?.general || null); }, () => setError('Could not load your chosen stay.'));
  }, [userId, tripId]);
  return <section className="chosen-stay-card mb-5 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Your chosen stay</h2>{hotel ? <><p className="mt-2 font-medium">{hotel.name}</p><p className="mt-1 text-sm text-slate-600">{hotel.location} · {hotel.price}</p><p className="mt-2 text-xs text-slate-500">Tentative choice · not a reservation or confirmed price.</p><button disabled={busy} className="mt-3 text-sm font-semibold text-blue-700 disabled:opacity-50" onClick={async () => { setBusy(true); try { await changeChosenStay(userId, hotel, true); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>Unchoose stay</button></> : <p className="mt-2 text-sm text-slate-600">Find a hotel using this trip’s destination and dates.</p>}{!hotel && unlinked && <div className="mt-3 rounded-xl bg-blue-50 p-3"><p className="text-sm">You chose {unlinked.name} outside a saved trip. Link it here to show it on this itinerary.</p><button disabled={busy} className="mt-2 text-sm font-semibold text-blue-700" onClick={async () => { setBusy(true); try { await linkStayToTrip(userId, unlinked, { ...trip, id: tripId }); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>Use {unlinked.name} for this trip</button></div>}<button onClick={onBrowse} className="ml-3 mt-3 text-sm font-semibold text-blue-700">Find stays</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</section>;
}
