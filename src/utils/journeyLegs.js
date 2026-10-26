export function journeyLeg(plan, direction = 'onward') {
  if (direction === 'onward') return plan.travelInfo;
  return plan.travelInfo?.returnJourney || null;
}
export function applyJourneyLeg(plan, info, direction = 'onward') {
  if (direction === 'return') return { ...plan.travelInfo, returnJourney: info, returnDurationHours: info.durationHours };
  return { ...info, ...(plan.travelInfo?.returnJourney ? { returnJourney: plan.travelInfo.returnJourney, returnDurationHours: plan.travelInfo.returnJourney.durationHours } : {}) };
}
export function invalidManaliRail(info) {
  return /manali\s+(?:railway\s+station|station)|train\s+(?:to|from)\s+manali|(?:to|from)\s+manali\s*\(man\)/i.test([info?.fromStation, info?.toStation, ...(info?.steps || [])].join(' '));
}
export function removeJourney(plan,direction){
 const removedJourneys=[...new Set([...(plan.removedJourneys||[]),direction])];
 let travelInfo=plan.travelInfo?{...plan.travelInfo}:null;
 if(direction==='return'&&travelInfo){delete travelInfo.returnJourney;delete travelInfo.returnDurationHours;}
 if(direction==='onward'&&travelInfo){delete travelInfo.costEstimate;}
 const days=(plan.days||[]).filter(day=>day.travelReservation?.journeyId!==direction).map((day,index)=>({...day,day:index+1}));
 const journeys=(plan.travelSchedule?.journeys||[]).filter(journey=>journey.id!==direction);
 return {...plan,removedJourneys,travelInfo,days,travelSchedule:plan.travelSchedule?{...plan.travelSchedule,journeys}:null,totalBudget:null,budgetWarning:null};
}
