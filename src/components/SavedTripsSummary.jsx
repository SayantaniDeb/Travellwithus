import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Wallet, ClipboardList } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../Firebase';
import { savedTripsSummary } from '../utils/savedTripsSummary';
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
export default function SavedTripsSummary({trips,userId}){
 const route=useLocation(),navigate=useNavigate();
 const [tasks,setTasks]=useState({status:'loading',total:0,pending:0});
 const [day,setDay]=useState(today);
 useEffect(()=>{const refresh=()=>setDay(today());const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 useEffect(()=>{setTasks({status:'loading',total:0,pending:0});if(!db||!userId){setTasks({status:'error',total:0,pending:0});return;}return onSnapshot(collection(db,'users',userId,'todos'),snapshot=>{const entries=snapshot.docs.map(doc=>doc.data());setTasks({status:'ready',total:entries.length,pending:entries.filter(item=>!item.completed).length});},()=>setTasks({status:'error',total:0,pending:0}));},[userId]);
 const summary=savedTripsSummary(trips,day);
 const card='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
 return <section aria-label="Saved trips overview" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
  <div className={card}><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><CalendarDays size={17} className="text-blue-600"/>Total trips</div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{summary.total}</p><p className="mt-1 text-xs text-slate-500">{summary.activeCount} ongoing or upcoming</p></div>
  <Link to="/budgets" className={`${card} transition hover:border-blue-300 focus-visible:outline-blue-600`}><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Wallet size={17} className="text-violet-600"/>Total active budget</div><div className="mt-3 space-y-1 text-xl font-bold tabular-nums text-slate-900">{Object.entries(summary.budgets).length?Object.entries(summary.budgets).sort(([a],[b])=>a.localeCompare(b)).map(([currency,amount])=><p key={currency} className="break-words">{currency} {amount.toLocaleString(undefined,{maximumFractionDigits:2})}</p>):<p>0</p>}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">Budgets for ongoing and upcoming trips.{summary.undatedCount>0?` ${summary.undatedCount} undated trips excluded.`:''}</p></Link>
  <Link to="/Todolist" onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate('/Todolist',{state:{checklistOrigin:{path:route.pathname+route.search,scrollY:window.scrollY}}});}}} className={`${card} transition hover:border-blue-300 focus-visible:outline-blue-600`}><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><ClipboardList size={17} className="text-emerald-600"/>Total list items</div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{tasks.status==='ready'?tasks.total:tasks.status==='error'?'Unavailable':'…'}</p><p className="mt-1 text-xs text-slate-500">{tasks.status==='ready'?`${tasks.pending} still to do · Open checklist →`:tasks.status==='error'?'Open checklist to retry':'Loading checklist…'}</p></Link>
 </section>;
}
