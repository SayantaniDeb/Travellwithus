export function groupTodos(todos,trips){
 const known=new Map(trips.map(trip=>[trip.id,trip]));
 const groups=new Map();
 for(const todo of todos){
  const id=todo.tripId||'';
  if(!groups.has(id)){const trip=known.get(id);groups.set(id,{id,trip,title:!id?'General list':trip?.actualDestination||trip?.destination||'Unavailable trip',items:[]});}
  groups.get(id).items.push(todo);
 }
 return [...groups.values()].sort((a,b)=>!a.id?1:!b.id?-1:a.title.localeCompare(b.title));
}
