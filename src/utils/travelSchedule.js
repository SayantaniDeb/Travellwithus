import { addDays, daysBetween } from './tripDates.js';

const onboard = [
  'Rest during the journey, with meals at scheduled stops or on board.',
  'Listen to music or an audiobook while travelling as a passenger.',
  'Read or journal during the journey; keep transfers and scheduled stops unchanged.',
  'Enjoy the scenery from your seat and take breaks only at scheduled stops.',
];
const periods = ['morning', 'afternoon', 'evening'];

const passengerTitles = ['Rest & recharge', 'Music or audiobook break', 'Read & journal', 'Scenery & quiet time'];
const roadSuggestions = [
  ['Drive the planned route', 'Follow the planned road route and stop regularly in safe designated rest areas.'],
  ['Rest & refuel', 'Take a planned break at a safe rest area; stretch, hydrate and refuel as needed.'],
  ['Continue with safe breaks', 'Continue along the route only while rested. Stop somewhere safe if tired; adjust the journey timing as needed.'],
];
export function travelActivityTitle(day, period) {
  const item = day?.[period];
  if (!day?.travelReservation) return item?.activity;
  const road = /car|motorbike|motorcycle/i.test(day.travelReservation.mode || '');
  if (road) return item?.activity && !item.activity.includes('journey ·') ? item.activity : roadSuggestions[periods.indexOf(period)]?.[0];
  return passengerTitles[Number.isInteger(item?.onboardChoice) ? item.onboardChoice : Math.max(0, periods.indexOf(period))] || item?.activity;
}

export function travelHours(info) {
  if (Number.isFinite(Number(info?.durationHours)) && Number(info.durationHours) > 0) return Number(info.durationHours);
  const text = String(info?.travelDuration || '').toLowerCase();
  const days = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:days?|d\b)/g)].map(match => Number(match[1]));
  const hours = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/g)].map(match => Number(match[1]));
  const minutes = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/g)].map(match => Number(match[1]));
  // A duration range uses its upper endpoint, not its lower endpoint.
  const range = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/);
  const total = (days.length ? Math.max(...days) * 24 : 0) + (hours.length ? Math.max(...hours) : 0) + (minutes.length ? Math.max(...minutes) / 60 : 0);
  return range ? Math.max(total, Number(range[2])) : total || null;
}

export function reserveTravelDays(plan) {
  if (plan.includeTravel === false) return plan;
  const hours = travelHours(plan.travelInfo);
  if (!hours) throw new Error('A journey duration is needed before travel days can be reserved. Add or refresh travel directions first.');
  const days = plan.days || [];
  const start = plan.startDate || days[0]?.date;
  const end = plan.endDate || days[days.length - 1]?.date;
  const totalDays = daysBetween(start, end) + 1;
  if (!Number.isInteger(totalDays) || totalDays < 1 || days.length !== totalDays) throw new Error('The itinerary must have one card for each selected calendar date.');
  const onwardCount = plan.removedJourneys?.includes('onward') ? 0 : Math.ceil(hours / 24);
  const returnHours = Number(plan.travelInfo.returnJourney?.durationHours || plan.travelInfo.returnDurationHours) > 0 ? Number(plan.travelInfo.returnJourney?.durationHours || plan.travelInfo.returnDurationHours) : hours;
  const returnCount = plan.removedJourneys?.includes('return') ? 0 : Math.ceil(returnHours / 24);
  if (onwardCount + returnCount > totalDays) throw new Error(`The estimated journeys need ${onwardCount + returnCount} travel days, but your dates contain ${totalDays}. Extend the dates or choose a faster transport option.`);
  const destination = plan.actualDestination || plan.destination;
  const mode = plan.travelInfo.recommendedMode || 'Transport';
  const journeys = [
    { id: 'onward', label: 'Onward journey', from: plan.source || plan.travelInfo.from, to: destination, mode, durationHours: hours, startDate: start, endDate: addDays(start, onwardCount - 1), dayCount: onwardCount },
    { id: 'return', label: 'Return journey', from: destination, to: plan.source || plan.travelInfo.from, mode: plan.travelInfo.returnJourney?.recommendedMode || mode, durationHours: returnHours, startDate: addDays(end, 1 - returnCount), endDate: end, dayCount: returnCount },
  ];
  const reserved = days.map((existing, index) => {
    const date = addDays(start, index);
    const journey = index < onwardCount ? journeys[0] : index >= totalDays - returnCount ? journeys[1] : null;
    if (!journey) {
      if (!existing.travelReservation) return { ...existing, day: index + 1, date };
      const free = { day: index + 1, date, title: 'Destination day', summary: 'Time available at the destination. Refresh this day to choose activities.', estimatedCost: null };
      for (const period of periods) free[period] = { activity: 'Free time at the destination', description: 'Refresh this day to plan activities after your journey.', location: destination, duration: 'Flexible', estimatedCost: 'Not estimated' };
      return free;
    }
    // Preserve an existing reserved day's onboard choices only if its journey is unchanged.
    const unchanged = existing.travelReservation?.journeyId === journey.id && existing.travelReservation?.mode === journey.mode && existing.travelReservation?.durationHours === journey.durationHours;
    const day = { day: index + 1, date, title: `${journey.label} to ${journey.to}`, summary: `Reserved for ${journey.mode.toLowerCase()} travel from ${journey.from} to ${journey.to}. No destination sightseeing is scheduled.`,
      travelReservation: { journeyId: journey.id, mode: journey.mode, from: journey.from, to: journey.to, durationHours: journey.durationHours },
      meals: { breakfast: 'Breakfast on board or at a scheduled stop; confirm availability.', lunch: 'Lunch on board or at a scheduled stop; confirm availability.', dinner: 'Dinner on board or at a scheduled stop; confirm availability.' },
      estimatedCost: null, tips: ['Confirm departure, arrival, connections and meal availability with the operator.'] };
    for (const [periodIndex, period] of periods.entries()) day[period] = unchanged ? existing[period] : { activity: /car|motorbike|motorcycle/i.test(journey.mode) ? roadSuggestions[periodIndex][0] : passengerTitles[periodIndex], description: /car|motorbike|motorcycle/i.test(journey.mode) ? roadSuggestions[periodIndex][1] : onboard[periodIndex], location: `${journey.from} → ${journey.to}`, duration: 'Within the reserved travel day', estimatedCost: 'Not estimated', onboardChoice: periodIndex };
    return day;
  });
  return { ...plan, days: reserved, travelSchedule: { journeys: journeys.filter(journey => journey.dayCount > 0), destinationDays: totalDays - onwardCount - returnCount, allocation: 'full-calendar-days', returnDurationAssumed: !(Number(plan.travelInfo.returnJourney?.durationHours || plan.travelInfo.returnDurationHours) > 0) }, totalBudget: null, budgetWarning: null };
}

export function refreshOnboardDay(plan, index, period = null) {
  const original = plan.days[index];
  if (!original?.travelReservation || (period !== null && !periods.includes(period))) throw new Error('Not a reserved travel activity.');
  const day = { ...original };
  for (const key of period ? [period] : periods) {
    const choice = ((Number(original[key]?.onboardChoice) || 0) + 1) % onboard.length;
    const road = /car|motorbike|motorcycle/i.test(original.travelReservation.mode || '');
    const roadChoice = choice % roadSuggestions.length;
    day[key] = { ...original[key], activity: road ? roadSuggestions[roadChoice][0] : passengerTitles[choice], description: road ? roadSuggestions[roadChoice][1] : onboard[choice], onboardChoice: choice };
  }
  return { ...plan, days: plan.days.map((item, dayIndex) => dayIndex === index ? day : item) };
}

// Directions remain useful even when their travel time cannot fit the current dates.
export function attachTravelDirections(plan, travelInfo, source) {
  const withDirections = { ...plan, travelInfo, source, includeTravel: true, travelSchedule: null, totalBudget: null, budgetWarning: null };
  try {
    return { plan: reserveTravelDays(withDirections), notice: '' };
  } catch (error) {
    return { plan: withDirections, notice: `Travel directions are ready, but the calendar was not changed. ${error.message}` };
  }
}
