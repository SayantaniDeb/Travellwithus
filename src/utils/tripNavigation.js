export function savedTripPath(tripId) {
  return tripId ? `/saved-trips?trip=${encodeURIComponent(tripId)}` : '/saved-trips';
}

export function canResumeTrip(plan) {
  return Boolean(plan && Array.isArray(plan.days) && plan.days.length && plan.days.every(day => day && typeof day.date === 'string' && typeof day.title === 'string' && (day.isDraftDay === true || ['morning','afternoon','evening'].every(period => typeof day[period]?.activity === 'string' && day[period].activity.trim()))));
}
export function plannerReturnPath(plan) {
  return `/plan-trip?destination=${encodeURIComponent(plan.plannerDestination || plan.destination || plan.actualDestination || '')}`;
}
