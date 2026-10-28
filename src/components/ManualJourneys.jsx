import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { Button, Input, NativeSelect } from './ui/form-controls';
import { journeyLeg, applyJourneyLeg } from '../utils/journeyLegs';
import { savedLegCost } from '../utils/journeyCost';

export default function ManualJourneys({plan,onChange}) {
 return <section className="journey-tickets mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><h2 className="font-semibold">Your journeys</h2><p className="mt-1 text-xs text-slate-500">Add routes and costs yourself. No AI or booking required.</p><div className="mt-4 grid items-start gap-4 lg:grid-cols-2">{['onward','return'].map(direction=><ManualLeg key={`${plan.id || 'draft'}-${direction}`} direction={direction} plan={plan} onChange={onChange}/>)}</div></section>;
}
function ManualLeg({plan,direction,onChange}) {
 const info=plan.removedJourneys?.includes(direction)?null:journeyLeg(plan,direction);
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState(null),[tab,setTab]=useState('route');
 const title=direction==='onward'?'Onward':'Return',Icon=direction==='onward'?ArrowUpRight:ArrowDownLeft;
 const edit=()=>{
  setDraft({from:info?.from || (direction==='onward'?plan.source:plan.actualDestination || plan.destination) || '',to:info?.to || (direction==='return'?plan.source:plan.actualDestination || plan.destination) || '',date:info?.manualDate || (direction==='return'?plan.endDate:plan.startDate) || '',mode:info?.recommendedMode || 'Train',duration:info?.travelDuration || '',notes:info?.steps?.join('\n') || '',amount:info?.costEstimate?.amount ?? '',travelers:info?.costEstimate?.travelers || 1});setTab('route');setEditing(true);setError('');
 };
 const field=(name,value)=>setDraft(current=>({...current,[name]:value}));
 const save=async event=>{
  event.preventDefault();setError('');
  if(!draft.from.trim()||!draft.to.trim()||!draft.date){setTab('route');setError('Add a starting point, destination, and journey date.');return;}
  if(!Number.isInteger(Number(draft.travelers))||Number(draft.travelers)<1){setTab('cost');setError('Enter at least one traveler.');return;}
  setBusy(true);
  try {
   const amount=draft.amount===''?null:Number(draft.amount);
   if(amount!==null&&(!Number.isFinite(amount)||amount<0))throw Error('Enter a valid nonnegative fare.');
   const leg={from:draft.from.trim(),to:draft.to.trim(),manual:true,manualDate:draft.date,recommendedMode:draft.mode,travelDuration:draft.duration.trim(),steps:draft.notes.split('\n').map(line=>line.trim()).filter(Boolean),costEstimate:amount===null?null:{kind:'quote',amount,travelers:Number(draft.travelers),date:draft.date,currency:plan.currency || 'INR',provider:'Manual entry',recordedAt:new Date().toISOString()}};
   await onChange({travelInfo:applyJourneyLeg(plan,leg,direction),removedJourneys:(plan.removedJourneys||[]).filter(item=>item!==direction),includeTravel:true,totalBudget:null,budgetWarning:null});setEditing(false);
  }catch(err){setError(err.message || 'Could not save this journey. Your entries are kept.');}finally{setBusy(false);}
 };
 const total=savedLegCost(plan,direction);
 return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white"><header className="flex items-center gap-2 rounded-t-2xl border-b border-slate-100 bg-blue-50/50 p-4"><Icon size={18} className="text-blue-600"/><h3 className="text-sm font-semibold">{title} journey</h3></header><div className="p-4">
 {info?.from && <><p className="break-words text-sm font-medium">{info.from} → {info.to}</p><p className="mt-2 text-xs text-slate-500">{info.manualDate || (direction==='return'?plan.endDate:plan.startDate)} · {info.recommendedMode}{info.travelDuration ? ` · ${info.travelDuration}` : ''}</p>{info.steps?.length>0&&<p className="mt-3 whitespace-pre-line text-sm text-slate-500">{info.steps.join('\n')}</p>}<p className="mt-3 text-sm font-semibold text-emerald-700">{total===null?'Fare not added':`${plan.currency || 'INR'} ${total.toLocaleString()}`}</p></>}
 <Button className="mt-3" onClick={edit}>{info?.from?`Edit ${direction} journey`:`Add ${direction} journey`}</Button>
 <Dialog open={editing} onClose={()=>{if(!busy)setEditing(false);}} className="relative z-[220]">
  <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md" aria-hidden="true"/>
  <div className="manual-day-dialog fixed inset-0 flex items-center justify-center p-3 sm:p-6">
   <Dialog.Panel className="manual-day-panel flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6"><div><Dialog.Title className="text-base font-semibold text-slate-900">{info?.from?'Edit':'Add'} {direction} journey</Dialog.Title><Dialog.Description className="mt-1 text-xs text-slate-500">Your route, transport and fare estimate</Dialog.Description></div><button type="button" disabled={busy} onClick={()=>setEditing(false)} aria-label="Close journey editor" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={19}/></button></header>
    {draft && <form onSubmit={save} className="flex min-h-0 flex-col">
     <div className="min-h-0 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
      <div role="tablist" aria-label={`${title} journey details`} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">{[['route','Route & transport'],['cost','Fare & notes']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={`min-h-10 rounded-lg px-2 text-xs font-medium ${tab===id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}>{label}</button>)}</div>
      <div hidden={tab!=='route'} className="space-y-3">
       {[['from','From'],['to','To']].map(([name,label])=><label key={name} className="block text-xs font-medium text-slate-700">{label}<Input aria-label={`${title} ${label}`} className="mt-1 !h-10 !text-sm" value={draft[name]} onChange={e=>field(name,e.target.value)}/></label>)}
       <div className="grid grid-cols-2 gap-3">{[['date','Journey date'],['duration','Duration · optional']].map(([name,label])=><label key={name} className="min-w-0 text-xs font-medium text-slate-700">{label}<Input aria-label={`${title} ${label}`} className="mt-1 !h-10 !text-sm" type={name==='date'?'date':'text'} value={draft[name]} onChange={e=>field(name,e.target.value)}/></label>)}</div>
       <label className="block text-xs font-medium text-slate-700">Transport<NativeSelect aria-label={`${title} transport`} className="mt-1 !h-10 !text-sm" value={draft.mode} onChange={e=>field('mode',e.target.value)}><option>Train</option><option>Bus</option><option>Flight</option><option>Car</option><option>Motorbike</option><option>Other</option></NativeSelect></label>
      </div>
      <div hidden={tab!=='cost'} className="space-y-3">
       <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-slate-700">Fare per person · optional<Input aria-label={`${title} fare`} className="mt-1 !h-10 !text-sm" type="number" min="0" step="0.01" value={draft.amount} onChange={e=>field('amount',e.target.value)}/></label><label className="text-xs font-medium text-slate-700">Travelers<Input aria-label={`${title} travelers`} className="mt-1 !h-10 !text-sm" type="number" min="1" step="1" value={draft.travelers} onChange={e=>field('travelers',e.target.value)}/></label></div>
       <label className="block text-xs font-medium text-slate-700">Route / notes<textarea aria-label={`${title} notes`} value={draft.notes} onChange={e=>field('notes',e.target.value)} className="mt-1 block h-28 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"/></label>
       <p className="text-xs leading-5 text-slate-500">Manual estimates only. Journey cards do not replace your daily activities.</p>
      </div>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
     </div>
     <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" disabled={busy} onClick={()=>setEditing(false)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600">Cancel</button><Button type="submit" disabled={busy} className="!h-10">{busy?'Saving…':`Save ${direction} journey`}</Button></footer>
    </form>}
   </Dialog.Panel>
  </div>
 </Dialog>
 </div></article>;
}
