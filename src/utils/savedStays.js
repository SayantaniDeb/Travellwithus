import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../Firebase';

export const stayGroup = hotel => hotel.tripId || 'general';
export function chooseStay(data, hotel, remove = false) {
  const group = stayGroup(hotel);
  const choices = { ...(data.chosenStays || {}) };
  if (remove) {
    if (choices[group]?.id === hotel.id) delete choices[group];
  } else {
    if (!hotel.tripId) throw new Error('Assign this hotel to a trip before choosing it.');
    if (!(data.hotelDetails || []).some(saved => saved.id === hotel.id)) throw new Error('Save this hotel before choosing it.');
    if (choices[group] && choices[group].id !== hotel.id) throw new Error('Unchoose your current stay before choosing another.');
    choices[group] = hotel;
  }
  return choices;
}
export async function changeChosenStay(userId, hotel, remove = false) {
  const ref = doc(db, 'user_shortlists', userId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Save a hotel before choosing a stay.');
    transaction.update(ref, { chosenStays: chooseStay(snapshot.data() || {}, hotel, remove) });
  });
}
export async function toggleSavedStay(userId, hotel) {
  const ref = doc(db, 'user_shortlists', userId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const saved = data.hotelDetails || [];
    const exists = saved.some(value => value.id === hotel.id);
    if (exists && data.chosenStays?.[stayGroup(hotel)]?.id === hotel.id) throw new Error('Unchoose this stay before removing it from your favorites.');
    const details = exists ? saved.filter(value => value.id !== hotel.id) : [...saved, hotel];
    transaction.set(ref, { hotels: details.map(value => value.id), hotelDetails: details }, { merge: true });
  });
}

export async function linkStayToTrip(userId, hotel, trip, choose = true) {
  const ref = doc(db, 'user_shortlists', userId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const saved = data.hotelDetails || [];
    if (!saved.some(item => item.id === hotel.id)) throw new Error('This hotel is no longer saved.');
    if (hotel.tripId && hotel.tripId !== trip.id) throw new Error('This stay already belongs to another trip.');
    const target = data.chosenStays?.[trip.id];
    const wasChosen = data.chosenStays?.general?.id === hotel.id;
    if ((choose || wasChosen) && target && target.id !== hotel.id) throw new Error('Unchoose this trip’s current stay first.');
    const linked = { ...hotel, tripId: trip.id, tripName: trip.actualDestination || trip.destination, tripDates: `${trip.startDate || ''} – ${trip.endDate || ''}` };
    const choices = { ...(data.chosenStays || {}) };
    if (choices.general?.id === hotel.id) delete choices.general;
    if (choose || wasChosen) choices[trip.id] = linked;
    transaction.update(ref, { hotelDetails: saved.map(item => item.id === hotel.id ? linked : item), chosenStays: choices });
  });
}
