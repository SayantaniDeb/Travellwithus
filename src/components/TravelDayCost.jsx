import { savedLegCost } from '../utils/journeyCost';
export default function TravelDayCost({ plan, day }) {
  if (!day?.travelReservation) return null;
  const direction=day.travelReservation.journeyId;
  const amount=savedLegCost(plan,direction);
  const count=plan.days.filter(item=>item.travelReservation?.journeyId===direction).length;
  return <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-200 pt-3"><div><p className="text-xs font-medium text-slate-600">{direction==='return'?'Return':'Onward'} journey cost</p><p className="mt-1 text-[11px] text-slate-400">{count>1?`Whole journey · spans ${count} days · counted once`:'Whole journey · planning estimate'}</p></div><p aria-live="polite" className="shrink-0 text-sm font-semibold tabular-nums text-blue-700">{amount===null?'Not added':`≈ ${plan.currency || 'INR'} ${amount.toLocaleString()}`}</p></div>;
}
