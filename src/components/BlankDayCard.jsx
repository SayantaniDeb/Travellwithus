import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Pencil, Sun, Sunset, Moon, Loader2 } from 'lucide-react';
import { Button, Input } from './ui/form-controls';
const periods = [{id:'morning',label:'Morning',Icon:Sun},{id:'afternoon',label:'Afternoon',Icon:Sunset},{id:'evening',label:'Evening',Icon:Moon}];
export default function BlankDayCard({ day, label, onGenerate, onSave, busy, manual = false }) {
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(day),[period,setPeriod]=useState('morning'),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const written=!day.isDraftDay;
 const open=()=>{setDraft(structuredClone(day));setPeriod('morning');setError('');setEditing(true);};
 const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const activity=(key,value)=>setDraft(current=>({...current,[period]:{...current[period],[key]:value}}));
 const submit=async event=>{
  event.preventDefault();
  if(!draft.title?.trim()){setError('Add a title for this day.');return;}
  const missing=periods.find(({id})=>!draft[id]?.activity?.trim());
  if(missing){setPeriod(missing.id);setError(`Add an activity for ${missing.label.toLowerCase()}.`);return;}
  setSaving(true);setError('');
  try{await onSave({...draft,title:draft.title.trim(),isDraftDay:false});setEditing(false);}catch(err){setError(err.message||'Could not save this day. Your entries are kept.');}finally{setSaving(false);}
 };
 return <article className="min-w-0 rounded-2xl border border-blue-200 bg-white p-4">
  <div className="flex items-center justify-between gap-2 text-xs"><span className="rounded-lg bg-blue-600 px-3 py-1 text-white">{label||`Day ${day.day}`}</span><span className="text-slate-500">{day.date}</span></div>
  <h3 className="mt-4 break-words font-semibold">{written ? day.title : manual ? 'Plan this day' : 'Your extra day'}</h3>
  {written ? <ul className="mt-3 space-y-2">{periods.map(({id,label,Icon})=><li key={id} className="flex min-w-0 items-start gap-2 text-xs text-slate-500"><Icon size={14} className="shrink-0"/><span className="line-clamp-2">{label} · {day[id]?.activity}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{manual ? 'Fill in your activities and optional cost estimates.' : 'Add your own activities or generate a plan for this day.'}</p>}
  <div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={open} className="border border-slate-200 !bg-white !text-slate-700 hover:!bg-slate-50"><Pencil size={15}/>{written ? 'Edit day' : 'Write manually'}</Button>{!manual&&<Button aria-label={`Generate day ${day.day}`} disabled={busy} onClick={onGenerate}>{busy?'Generating…':'↻ Generate day'}</Button>}</div>
  <Dialog open={editing} onClose={()=>{if(!saving)setEditing(false);}} className="relative z-[220]">
   <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md" aria-hidden="true"/>
   <div className="manual-day-dialog fixed inset-0 flex items-center justify-center p-3 sm:p-6">
    <Dialog.Panel className="manual-day-panel flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
     <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6"><div><Dialog.Title className="text-base font-semibold text-slate-900">{written?'Edit your day':'Make this day yours'}</Dialog.Title><Dialog.Description className="mt-1 text-xs text-slate-500">{label||`Day ${day.day}`} · {day.date}</Dialog.Description></div><button type="button" disabled={saving} onClick={()=>setEditing(false)} aria-label="Close day editor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={19}/></button></header>
     <form onSubmit={submit} className="flex min-h-0 flex-col" noValidate>
      <div className="min-h-0 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
       <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3 sm:grid-cols-[minmax(0,1fr)_140px]"><label className="min-w-0 text-xs font-medium text-slate-700">Day title<Input autoFocus aria-label="Day title" className="mt-1 !h-10 !text-sm" placeholder="e.g. Explore the old town" value={draft.title||''} maxLength={150} onChange={e=>change('title',e.target.value)}/></label><label className="text-xs font-medium text-slate-700">Day cost · optional<Input aria-label="Estimated day cost" className="mt-1 !h-10 !text-sm" type="number" min="0" placeholder="0.00" value={draft.estimatedCost??''} onChange={e=>change('estimatedCost',e.target.value||null)}/></label></div>
       <div role="tablist" aria-label="Time of day" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{periods.map(({id,label,Icon})=><button key={id} id={`day-${day.day}-${id}-tab`} type="button" role="tab" aria-selected={period===id} aria-controls={`day-${day.day}-${id}-panel`} onClick={()=>{setPeriod(id);setError('');}} className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium transition ${period===id?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><Icon size={14}/>{label}</button>)}</div>
       <section role="tabpanel" id={`day-${day.day}-${period}-panel`} aria-labelledby={`day-${day.day}-${period}-tab`} className="space-y-3">
        <label className="block text-xs font-medium text-slate-700">Activity<Input aria-label={`${period} activity`} className="mt-1 !h-10 !text-sm" placeholder="What would you like to do?" value={draft[period]?.activity||''} maxLength={300} onChange={e=>activity('activity',e.target.value)}/></label>
        <label className="block text-xs font-medium text-slate-700">Location · optional<Input aria-label={`${period} location`} className="mt-1 !h-10 !text-sm" placeholder="Place or meeting point" value={draft[period]?.location||''} maxLength={300} onChange={e=>activity('location',e.target.value)}/></label>
        <label className="block text-xs font-medium text-slate-700">Notes · optional<textarea aria-label={`${period} details`} className="mt-1 block h-20 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Details, timings, or things to remember" value={draft[period]?.description||''} onChange={e=>activity('description',e.target.value)}/></label>
       </section>
       {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      </div>
      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" disabled={saving} onClick={()=>setEditing(false)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-600">Cancel</button><Button type="submit" disabled={saving||busy} className="!h-10">{saving&&<Loader2 size={15} className="animate-spin"/>}{saving?'Saving…':'Save day'}</Button></footer>
     </form>
    </Dialog.Panel>
   </div>
  </Dialog>
 </article>;
}
