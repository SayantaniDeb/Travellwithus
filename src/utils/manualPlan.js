import { addDays, daysBetween } from './tripDates.js';
export function manualPlan({destination,source,startDate,endDate,currency,budgetAmount}) {
 const count=daysBetween(startDate,endDate)+1;
 if(!Number.isInteger(count)||count<1||count>30)throw new Error('Choose between 1 and 30 calendar dates.');
 return {destination,actualDestination:destination,source,startDate,endDate,currency,budgetAmount:Number(budgetAmount)||0,manual:true,includeTravel:false,includeHotels:false,summary:'Your own itinerary. Add activities and estimates for each day.',packingList:[],days:Array.from({length:count},(_,i)=>({day:i+1,date:addDays(startDate,i),isDraftDay:true,title:'',summary:'',estimatedCost:null,...Object.fromEntries(['morning','afternoon','evening'].map(period=>[period,{activity:'',description:'',location:'',estimatedCost:''}]))}))};
}
