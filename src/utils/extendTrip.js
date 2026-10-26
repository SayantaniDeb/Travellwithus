import { addDays } from './tripDates.js';
import { reserveTravelDays } from './travelSchedule.js';
export function extendTrip(plan) {
  if (!plan.days?.length) throw new Error('Add a day to an existing itinerary.');
  const end = plan.endDate || plan.days[plan.days.length - 1].date;
  const start = plan.startDate || plan.days[0].date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end || '') || !/^\d{4}-\d{2}-\d{2}$/.test(start || '')) throw new Error('Trip dates are required to extend this itinerary.');
  const returnIndex = plan.days.findIndex(day => day.travelReservation?.journeyId === 'return');
  const index = returnIndex < 0 ? plan.days.length : returnIndex;
  const draft = { isDraftDay: true, title: 'Plan your extra day', summary: '', estimatedCost: null };
  for (const period of ['morning','afternoon','evening']) draft[period] = { activity: '', description: '', location: '', duration: '', estimatedCost: '' };
  let days = [...plan.days.slice(0,index),draft,...plan.days.slice(index)].map((day,i)=>({...day,day:i+1,date:addDays(start,i)}));
  let updated = {...plan,startDate:start,endDate:addDays(end,1),days,totalBudget:null,budgetWarning:null};
  if (plan.travelSchedule) updated=reserveTravelDays(updated);
  return {plan:updated,index};
}
