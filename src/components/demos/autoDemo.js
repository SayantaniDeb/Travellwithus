import { STEP_FRAMES } from './features';
// Deterministic frame-based actions keep playback, seeking and reduced-motion predictable.
export function autoDemo(id, frame) {
  const step=Math.min(2,Math.floor(frame/STEP_FRAMES));
  const progress=(frame%STEP_FRAMES)/STEP_FRAMES;
  const done=progress>.5;
  const type=text=>text.slice(0,Math.floor(Math.min(1,progress*2)*text.length));
  switch(id){
    case 'planner':return {days:step===0?3:4,budget:step===0?10000:20000,generated:step===2,activity:step===2&&done?1:0};
    case 'trips':return {saved:step>0||done,days:step===2&&done?4:3};
    case 'community':return {question:step===0?type('Mountains or coast?'):'Mountains or coast?',reply:step===2&&!done?type('The coast looks lovely!'):'',posted:step===2&&done?'The coast looks lovely!':'',selection:step>0&&done?1:0};
    case 'budget':return {limit:6000,amount:step===1?Number(type('250')):250,logged:step===2||step===1&&progress>.8?250:0};
    case 'weather':return {city:step===0?'Darjeeling':'Goa',selection:step===2&&done?1:0};
    case 'checklist':return {task:step===0&&!done?type('Raincoat'):'',items:step===0&&!done?['Water bottle','Travel documents']:['Water bottle','Travel documents','Raincoat'],tripName:step>=1&&done?'Darjeeling trip':'General list',checked:step===2?{0:done,1:progress>.8}:{}};
    case 'hotels':return {limit:step===1&&done?2000:3000,saved:step===2&&done?{'Hillside guesthouse':true}:{}};
    default:return {selection:step>=1&&done?1:0};
  }
}
