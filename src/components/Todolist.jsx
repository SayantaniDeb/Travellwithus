import { listGuestTrips, listGuestTodos, saveGuestTodo, deleteGuestTodo, saveGuestTrip, GUEST_TRIPS_CHANGED } from '../utils/guestTrips';
import illustration from '../img/5.gif';
import { Trash2, Plus, Loader2, ClipboardList } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { groupTodos } from '../utils/todoGroups';
import Navbar from './Navbar';
import { Button, Input, Label, NativeSelect } from './ui/form-controls';
import { auth, db, onAuthStateChanged } from '../Firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function Todolist() {
  const navigate=useNavigate(),route=useLocation();
  const goBack=()=>{const origin=route.state?.checklistOrigin;if(origin?.path){navigate(origin.path,{replace:true,state:{restoreChecklistScroll:origin.scrollY||0}});}else if(window.history.state?.idx>0){navigate(-1);}else{const trip=params.get('trip');navigate(trip&&trip!=='general'?`/saved-trips?trip=${encodeURIComponent(trip)}`:'/saved-trips',{replace:true});}};
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [trips,setTrips]=useState([]),[tripsStatus,setTripsStatus]=useState('loading');
  const [params,setParams]=useSearchParams();
  const filter=params.get('trip')??'all';
  const [tripId,setTripId]=useState(()=>params.get('trip')||'');
  const [moving,setMoving]=useState(null);
  useEffect(()=>{if(filter!=='all')setTripId(filter==='general'?'':filter);},[filter]);
  useEffect(()=>{setTrips([]);setTripsStatus('loading');if(!user||!db)return;return onSnapshot(collection(db,'users',user.uid,'trips'),snapshot=>{setTrips(snapshot.docs.map(record=>({...record.data(),id:record.id})));setTripsStatus('ready');},()=>setTripsStatus('error'));},[user]);
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    setTodos([]);
    if (!user || !db) return;
    return onSnapshot(query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc')), snapshot => setTodos(snapshot.docs.map(record => ({ id: record.id, ...record.data() }))), err => setError(err.message));
  }, [user]);
  useEffect(() => {
    if (user) return;
    let active=true;
    const load=async()=>{
      try {
        const [deviceTrips, tasks]=await Promise.all([listGuestTrips(),listGuestTodos()]);
        if (!active) return;
        setTrips(deviceTrips);setTripsStatus('ready');
        setTodos([...tasks,...deviceTrips.flatMap(trip=>(trip.packingList||[]).map((item,index)=>({id:`packing:${trip.id}:${index}`,item,tripId:trip.id,completed:Boolean(trip.packingChecked?.[index]),packingIndex:index}))) ]);
      } catch(err) { if(active){setError(err.message);setTripsStatus('error');} }
    };
    load();window.addEventListener(GUEST_TRIPS_CHANGED,load);
    return()=>{active=false;window.removeEventListener(GUEST_TRIPS_CHANGED,load);};
  },[user]);
  const add = async event => {
    event.preventDefault();
    if (busy || !item.trim()) return;
    if(tripId&&!trips.some(trip=>trip.id===tripId)){setError('Choose an available trip or the General list.');return;}
    setBusy(true); setError('');
    try {
      if (user) await addDoc(collection(db, 'users', user.uid, 'todos'), { item: item.trim(), tripId:tripId||null, completed: false, createdAt: serverTimestamp() });
      else await saveGuestTodo({item:item.trim(),tripId:tripId||null,completed:false});
      setItem('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const change = async (todo, remove = false) => {
    const previous=todos;
    setTodos(current=>remove?current.filter(item=>item.id!==todo.id):current.map(item=>item.id===todo.id?{...item,completed:!todo.completed}:item));
    try {
      if (!user) {
        if (todo.packingIndex !== undefined) {
          const trip=trips.find(item=>item.id===todo.tripId);
          if (!trip) return;
          if (remove) {
            const remaining=trip.packingList.map((item,index)=>({item,checked:Boolean(trip.packingChecked?.[index])})).filter((_,index)=>index!==todo.packingIndex);
            await saveGuestTrip({...trip,packingList:remaining.map(entry=>entry.item),packingChecked:Object.fromEntries(remaining.map((entry,index)=>[index,entry.checked]))});
          } else await saveGuestTrip({...trip,packingChecked:{...trip.packingChecked,[todo.packingIndex]:!todo.completed}});
        } else if (remove) await deleteGuestTodo(todo.id);
        else await saveGuestTodo({...todo,completed:!todo.completed});
        return;
      }
      const reference = doc(db, 'users', user.uid, 'todos', todo.id);
      if (remove) await deleteDoc(reference); else await updateDoc(reference, { completed: !todo.completed });
    } catch (err) { setTodos(previous);setError(err.message); }
  };
  const move=async(todo,nextTrip)=>{
    if(moving)return;
    setMoving(todo.id);setError('');
    try{if(user)await updateDoc(doc(db,'users',user.uid,'todos',todo.id),{tripId:nextTrip||null});else await saveGuestTodo({...todo,tripId:nextTrip||null});}
    catch{setError('Could not move this task. Please try again.');}
    finally{setMoving(null);}
  };
  const groups=groupTodos(todos,trips).filter(group=>filter==='all'||group.id===(filter==='general'?'':filter));
  const tripLabel=trip=>`${trip.actualDestination||trip.destination||'Untitled trip'}${trip.startDate?` · ${trip.startDate}`:''}`;
  return <div className="relative min-h-screen trip-page-background"><div aria-hidden="true" className="pointer-events-none fixed inset-0"><img src={illustration} alt="" className="todo-illustration h-full w-full object-cover opacity-20" /></div><Navbar onBack={goBack} backLabel="Back to previous page"/><main className="relative z-10 mx-auto max-w-3xl px-4 pb-28 pt-28">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-serif text-2xl font-bold text-slate-900">Your trip checklists</h1><p className="mt-1 text-sm text-slate-500">Keep a separate list for every journey.</p></div><label className="text-xs text-slate-500">Show list<select aria-label="Filter checklist by trip" value={filter} onChange={e=>setParams(e.target.value==='all'?{}:{trip:e.target.value},{replace:true,state:route.state})} className="ml-2 max-w-[220px] rounded-lg border border-slate-200 bg-white p-2 text-sm"><option value="all">All lists</option><option value="general">General list</option>{trips.map(trip=><option key={trip.id} value={trip.id}>{tripLabel(trip)}</option>)}{filter!=='all'&&filter!=='general'&&!trips.some(trip=>trip.id===filter)&&<option value={filter}>Unavailable trip</option>}</select></label></div>
    <form onSubmit={add} className="mx-auto mb-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><ClipboardList aria-hidden="true" size={20}/></span>
        <div><h2 className="text-base font-semibold text-slate-900">One less thing to forget</h2><p className="mt-1 text-xs text-slate-500">Choose a list and add your next essential.</p></div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-task-trip">Add to list</Label>
        <NativeSelect id="new-task-trip" aria-label="Trip for new task" value={tripId} onChange={e=>setTripId(e.target.value)}>
          <option value="">General list</option>
          {trips.map(trip=><option key={trip.id} value={trip.id}>{tripLabel(trip)}</option>)}
          {tripId&&!trips.some(trip=>trip.id===tripId)&&<option value={tripId}>Unavailable trip</option>}
        </NativeSelect>
      </div>
      {tripsStatus==='error'&&<p role="status" className="mt-3 text-xs text-amber-700">Could not load your trips. General-list tasks are still available.</p>}
      <div className="mt-4 space-y-2">
        <Label htmlFor="todo-input">What do you need?</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input required maxLength={500} id="todo-input" value={item} onChange={event=>setItem(event.target.value)} placeholder="e.g. Pack a rain jacket" className="flex-1"/>
          <Button type="submit" disabled={busy}>{busy?<Loader2 aria-hidden="true" size={16} className="motion-safe:animate-spin"/>:<Plus aria-hidden="true" size={16}/>} {busy?'Adding…':'Add'}</Button>
        </div>
      </div>
    </form>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!user && <p className="mb-4 text-center text-sm text-slate-500">Checklists save on this device. Sign in to back them up.</p>}
    <div className="space-y-5">{groups.map(group=><section key={group.id||'general'} aria-label={`${group.title} checklist`} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-4 sm:px-5"><header className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{group.title}</h2><p className="mt-1 text-xs text-slate-500">{group.items.filter(todo=>!todo.completed).length} remaining · {group.items.length} tasks{group.trip?.startDate?` · ${group.trip.startDate}`:''}</p></div>{group.trip&&<Link to={`/saved-trips?${user ? '' : 'device=1&'}trip=${encodeURIComponent(group.id)}`} className="text-xs font-semibold text-blue-700">Open trip ↗</Link>}</header><ul>{group.items.map(todo=><li key={todo.id} className="flex items-center gap-3 border-b border-slate-200/70 py-3 last:border-0"><input type="checkbox" aria-label={`Complete ${todo.item}`} checked={!!todo.completed} onChange={()=>change(todo)} className="h-4 w-4 shrink-0 accent-blue-600"/><div className="min-w-0 flex-1"><p className={`break-words text-base ${todo.completed?'text-slate-400 line-through':'text-slate-900'}`}>{todo.item}</p><label className="mt-2 block text-[11px] text-slate-500">Move to<select aria-label={`List for ${todo.item}`} value={todo.tripId||''} disabled={moving===todo.id||todo.packingIndex!==undefined} onChange={e=>move(todo,e.target.value)} className="ml-2 max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"><option value="">General list</option>{trips.map(trip=><option key={trip.id} value={trip.id}>{tripLabel(trip)}</option>)}{todo.tripId&&!trips.some(trip=>trip.id===todo.tripId)&&<option value={todo.tripId}>Unavailable trip</option>}</select></label></div><button type="button" aria-label={`Delete ${todo.item}`} onClick={()=>change(todo,true)} className="rounded-full p-3 text-red-600 hover:bg-red-50"><Trash2 size={19}/></button></li>)}</ul></section>)}</div>
    {groups.length===0&&<p className="mt-10 text-center text-sm text-slate-500">This list is empty. Add your first task above.</p>}
  </main></div>;
}
