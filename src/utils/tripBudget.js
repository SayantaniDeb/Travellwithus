import { savedLegCost } from './journeyCost.js';
// Compare the budget with recorded estimates, never with the budget itself.
export function parseEstimatedCost(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}
export function tripBudgetSummary(trip, budget) {
  let estimate = 0;
  let missingDays = 0;
  for (const day of trip.days || []) {
    if(day.estimateCleared){missingDays++;continue;}
    let cost = parseEstimatedCost(day.estimatedCost);
    if (cost === null) {
      const parts = ['morning', 'afternoon', 'evening'].map(period => parseEstimatedCost(day[period]?.estimatedCost));
      if (parts.every(part => part !== null)) cost = parts.reduce((sum, part) => sum + part, 0);
    }
    if (cost === null) missingDays++;
    else estimate += cost;
  }
  const dayTotal = estimate;
  const dayCount = trip.days?.length || 0;
  const averagePerDay = dayCount && missingDays === 0 ? dayTotal / dayCount : null;
  const onward = savedLegCost(trip, 'onward');
  const returning = savedLegCost(trip, 'return');
  const travelTotal = onward !== null && returning !== null ? onward + returning : null;
  estimate += (onward ?? 0) + (returning ?? 0);
  const missingTravel = trip.includeTravel !== false && travelTotal === null;
  const available = Boolean(trip.days?.length) && missingDays === 0 && !missingTravel;
  return { estimate, dayTotal, dayCount, averagePerDay, travelTotal, available, missingDays, missingTravel, balance: Number(budget) - estimate };
}

export function budgetOnlyPatch(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive budget.');
  return { budgetAmount: amount, budgetWarning: null };
}
