// Trip day arrays are replaced immutably. Build the numbering index once per array.
const indexes=new WeakMap();
const key=day=>JSON.stringify([day.day,day.date]);
export function destinationDayNumber(days,day){
 if(!Array.isArray(days))return day.day;
 let index=indexes.get(days);
 if(!index){index=new Map();let count=0;for(const item of days){if(!item.travelReservation)count++;if(!index.has(key(item)))index.set(key(item),count);}indexes.set(days,index);}
 return index.get(key(day))??day.day;
}
export function itineraryDayLabel(days,day){
 return day.travelReservation?(day.travelReservation.journeyId==='return'?'Return travel':'Onward travel'):`Day ${destinationDayNumber(days,day)}`;
}
