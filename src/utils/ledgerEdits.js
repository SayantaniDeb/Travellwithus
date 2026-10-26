import { legDate } from './journeyCost';
export function estimateRowPatch(trip,row,amount){
 if(amount!==null&&(!Number.isFinite(amount)||amount<0))throw new Error('Enter a valid nonnegative amount.');
 if(row.type==='estimate'){
  const index=row.dayIndex;
  if(!trip.days?.[index]||trip.days[index].travelReservation)throw new Error('This day is no longer available.');
  return {days:trip.days.map((day,i)=>i===index?{...day,estimatedCost:amount,estimateCleared:amount===null,costs:null}:day),totalBudget:null,budgetWarning:null};
 }
 if(row.type==='journey'){
  const info={...trip.travelInfo};
  const costEstimate=amount===null?null:{kind:'quote',amount,travelers:1,currency:trip.currency||'INR',date:legDate(trip,row.direction),provider:'Manual ledger entry',recordedAt:new Date().toISOString()};
  if(row.direction==='return')info.returnJourney={...info.returnJourney,costEstimate};else info.costEstimate=costEstimate;
  return {travelInfo:info,totalBudget:null,budgetWarning:null};
 }
 throw new Error('Unknown estimate row.');
}
