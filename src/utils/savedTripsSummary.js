const dateOnly=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(value))return null;
 const day=value.slice(0,10),date=new Date(`${day}T00:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day?day:null;
};
export function savedTripsSummary(trips,today){
 const budgets={};let activeCount=0,undatedCount=0;
 for(const trip of trips){
  const end=dateOnly(trip.endDate)||dateOnly(trip.days?.at(-1)?.date)||dateOnly(trip.startDate);
  if(!end){undatedCount++;continue;}
  if(end<today||['cancelled','canceled','archived','completed'].includes(trip.status))continue;
  activeCount++;
  const amount=Number(trip.budgetAmount),currency=trip.currency||'INR';
  if(Number.isFinite(amount)&&amount>0)budgets[currency]=(budgets[currency]||0)+amount;
 }
 return {total:trips.length,activeCount,undatedCount,budgets};
}
