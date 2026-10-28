export function vehicleCost({ distanceKm, energyType, efficiency, unitPrice, chargingLossPercent = 0, extras = 0 }) {
  const distance = Number(distanceKm), economy = Number(efficiency), price = Number(unitPrice), extra = Number(extras || 0), loss = Number(chargingLossPercent || 0);
  if (![distance,economy,price,extra,loss].every(Number.isFinite) || distance <= 0 || economy <= 0 || price <= 0 || extra < 0 || loss < 0 || loss > 100 || !['petrol','diesel','ev'].includes(energyType)) return null;
  const units = energyType === 'ev' ? distance * economy / 100 * (1 + loss / 100) : distance / economy;
  return { units, energyCost: units * price, total: Math.round((units * price + extra) * 100) / 100 };
}
export function legDate(plan, direction) {
  const info=direction==='return'?plan.travelInfo?.returnJourney:plan.travelInfo;
  if(info?.manualDate)return info.manualDate;
  return plan.travelSchedule?.journeys?.find(item => item.id === direction)?.startDate || (direction === 'return' ? plan.endDate : plan.startDate) || '';
}
export function savedLegCost(plan, direction) {
  if(plan.removedJourneys?.includes(direction))return 0;
  const info = direction === 'return' ? plan.travelInfo?.returnJourney : plan.travelInfo;
  const cost = info?.costEstimate;
  if (!cost || cost.date !== legDate(plan,direction) || cost.currency !== (plan.currency || 'INR')) return null;
  const amount = cost.kind === 'vehicle' ? vehicleCost(cost.inputs)?.total : cost.kind === 'quote' && cost.amount !== null && cost.amount !== '' && Number(cost.amount) >= 0 && Number(cost.travelers) > 0 ? Number(cost.amount) * Number(cost.travelers) : null;
  return Number.isFinite(amount) ? amount : null;
}
