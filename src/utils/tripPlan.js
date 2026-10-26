// A service message or empty day list is not a completed itinerary.
export function isUsableTripPlan(plan) {
  return Boolean(plan && Array.isArray(plan.days) && plan.days.length > 0 &&
    plan.days.every(day => day && typeof day.title === 'string' &&
      ['morning', 'afternoon', 'evening'].every(period =>
        typeof day[period]?.activity === 'string' && day[period].activity.trim())));
}

export function replaceTripDay(plan, index, replacement) {
  if (plan.days[index]?.travelReservation) throw new Error('This journey is fixed. Refresh only its onboard suggestions.');
  if (!plan.days[index] || !isUsableTripPlan({ days: [replacement] })) {
    throw new Error('Invalid replacement day');
  }
  const day = { ...replacement, isDraftDay: false, day: plan.days[index].day, date: plan.days[index].date };
  return {
    ...plan,
    days: plan.days.map((existing, dayIndex) => dayIndex === index ? day : existing),
    totalBudget: null,
    budgetWarning: null,
  };
}

export function replaceTripPeriod(plan, dayIndex, period, replacement) {
  if (!['morning', 'afternoon', 'evening'].includes(period) ||
      !replacement || !['activity', 'description', 'location', 'duration', 'estimatedCost']
        .every(field => typeof replacement[field] === 'string' && replacement[field].trim())) {
    throw new Error('The replacement activity is incomplete. Please try again.');
  }
  const previous = plan.days[dayIndex];
  if (!previous) throw new Error('This day is no longer available.');
  const day = { ...previous, [period]: replacement, estimatedCost: null };
  day.summary = ['morning', 'afternoon', 'evening'].map(key => day[key]?.activity).filter(Boolean).join(' · ');
  return replaceTripDay(plan, dayIndex, day);
}

export function periodRefreshPrompt(plan, dayIndex, period) {
  if (!['morning', 'afternoon', 'evening'].includes(period) || !plan.days[dayIndex]) throw new Error('Invalid activity selection');
  return `Refresh the ${period} activity on this travel day, and reconcile the entire day around the change.
Destination: ${plan.actualDestination || plan.destination}. Source: ${plan.source || 'not specified'}.
Day to revise: ${JSON.stringify(plan.days[dayIndex])}.
Journey constraints: ${JSON.stringify(plan.travelInfo || {})}. Fixed calendar reservations: ${JSON.stringify(plan.travelSchedule || {})}.
Previous day: ${JSON.stringify(plan.days[dayIndex - 1] || null)}.
Next day: ${JSON.stringify(plan.days[dayIndex + 1] || null)}.
Currency: ${plan.currency || 'INR'}. Trip budget: ${plan.budgetAmount || 'flexible'}.
Rules:
- Change the selected activity; also update dependent meals, transfers, rest/check-in, later activities, title, summary, tips and costs when needed for a coherent day.
- Keep unrelated activities, accommodation, dates and other days unchanged.
- Preserve required arrival/departure travel and its timing. If the selected slot contains required transit, offer a compatible travel alternative; never replace transit with sightseeing that assumes arrival has already happened.
- Keep travel continuity with previous/next days and allow realistic transfer and rest time. No sightseeing before arrival.
- If a bus/train meal is no longer applicable, replace that meal and reconcile its timing and costs.
- Return ONLY JSON with a days array containing exactly ONE COMPLETE revised day. Include day, date, title, summary, morning, afternoon, evening, meals, tips, estimatedCost, and hotel if present originally.
- Each period must contain nonempty string fields activity, description, location, duration, estimatedCost. Meals must include breakfast, lunch, dinner as strings. Estimated costs are unverified estimates, not live prices.
- If no coherent revision is possible without changing another day or a booked journey, return {"error":"explain the conflict"} instead of an inconsistent plan.`;
}

export function applyPeriodRefresh(plan, dayIndex, response) {
  if (response?.error) throw new Error(String(response.error));
  if (!isUsableTripPlan(response) || response.days.length !== 1) throw new Error('A complete, consistent replacement day was not returned. Your plan has been kept.');
  const revised = response.days[0];
  for (const period of ['morning', 'afternoon', 'evening']) {
    if (!['activity', 'description', 'location', 'duration', 'estimatedCost'].every(key => typeof revised[period]?.[key] === 'string' && revised[period][key].trim())) throw new Error('The revised day is incomplete. Please try again.');
  }
  if (!['title', 'summary', 'estimatedCost'].every(key => typeof revised[key] === 'string' && revised[key].trim()) ||
      !['breakfast', 'lunch', 'dinner'].every(key => typeof revised.meals?.[key] === 'string' && revised.meals[key].trim())) throw new Error('Updated meals or day details are missing. Your plan has been kept.');
  return replaceTripDay(plan, dayIndex, { ...plan.days[dayIndex], ...revised, tips: Array.isArray(revised.tips) ? revised.tips : [] });
}
