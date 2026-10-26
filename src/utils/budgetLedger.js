import { itineraryDayLabel } from './dayLabels';
import { parseEstimatedCost } from './tripBudget';
import { savedLegCost } from './journeyCost';
export function budgetLedger(trip,expenses=[]){
 const rows=[];
 for(const [index,day] of (trip.days||[]).entries()){
  if(day.travelReservation)continue;
  let amount=parseEstimatedCost(day.estimatedCost)??parseEstimatedCost(day.costs?.subtotal);
  if(amount===null&&!day.estimateCleared){const parts=['morning','afternoon','evening'].map(period=>parseEstimatedCost(day[period]?.estimatedCost));if(parts.every(value=>value!==null))amount=parts.reduce((a,b)=>a+b,0);}
  rows.push({id:`plan-${index}`,dayIndex:index,date:day.date||'',description:`${itineraryDayLabel(trip.days,day)} · ${day.title||'Destination activities'}`,type:'estimate',amount:day.estimateCleared?null:amount});
 }
 if(trip.includeTravel!==false)for(const direction of ['onward','return'].filter(direction=>!trip.removedJourneys?.includes(direction)))rows.push({id:`journey-${direction}`,direction,date:direction==='onward'?trip.startDate:trip.endDate,description:`${direction==='onward'?'Onward':'Return'} journey`,type:'journey',amount:savedLegCost(trip,direction)});
 const baseline=rows.reduce((sum,row)=>sum+(row.amount??0),0),missing=rows.filter(row=>row.amount===null).length;
 const additional=expenses.map(item=>({...item,expenseId:item.id,id:`expense-${item.id}`,type:'additional',amount:Number.isFinite(Number(item.amount))&&Number(item.amount)>0?Number(item.amount):null}));
 const added=additional.reduce((sum,row)=>sum+(row.amount??0),0);
 return {rows:[...rows,...additional],baseline,added,total:baseline+added,missing,invalid:additional.filter(row=>row.amount===null).length};
}
