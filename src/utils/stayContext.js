import { daysBetween } from './tripDates.js';
import { parseEstimatedCost } from './tripBudget.js';

export function stayContext(plan) {
  // Carry the selected itinerary dates across even when full-day travel
  // reservations leave no sightseeing days. Hotel dates remain editable.
  const checkIn = plan.startDate || plan.days?.[0]?.date || '';
  const checkOut = plan.endDate || plan.days?.[plan.days.length - 1]?.date || '';
  const difference = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const nights = Number.isFinite(difference) ? Math.max(0, difference) : 0;
  const recommendations = [];
  const seen = new Set();
  for (const day of plan.days || []) {
    if (day.travelReservation || !day.hotel?.name || seen.has(day.hotel.name)) continue;
    seen.add(day.hotel.name);
    recommendations.push(day.hotel);
  }
  const prices = recommendations.map(hotel => parseEstimatedCost(hotel.pricePerNight)).filter(price => price !== null && price > 0);
  return { destination: plan.actualDestination || plan.destination || '', checkIn, checkOut, nights,
    currency: plan.currency || 'INR', perNightBudget: prices.length ? String(Math.max(...prices)) : '', recommendations };
}
