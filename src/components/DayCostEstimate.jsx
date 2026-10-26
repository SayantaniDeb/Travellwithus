import { parseEstimatedCost } from '../utils/tripBudget';
export function dayCostEstimate(day){
 if(day.estimateCleared)return null;
 if(day.estimatedCost!==undefined&&day.estimatedCost!==null&&day.estimatedCost!=='')return day.estimatedCost;
 if(day.costs?.subtotal!==undefined&&day.costs?.subtotal!==null&&day.costs?.subtotal!=='')return day.costs.subtotal;
 const amounts=['morning','afternoon','evening'].map(period=>parseEstimatedCost(day[period]?.estimatedCost));
 return amounts.every(value=>value!==null)?amounts.reduce((a,b)=>a+b,0):null;
}
export default function DayCostEstimate({day,currency='INR'}){
 if(day.travelReservation)return null;
 const cost=dayCostEstimate(day);
 return <div className="mt-3 border-t border-slate-200 pt-3"><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500">Est. day cost</span><span className="text-sm font-semibold text-emerald-700">{cost===null?'Not estimated':typeof cost==='number'?`${currency} ${cost.toLocaleString()}`:cost}</span></div>{cost===null&&<p className="mt-1 text-xs text-slate-500">No cost estimate was saved for this day. Refresh the day to generate one.</p>}</div>;
}
