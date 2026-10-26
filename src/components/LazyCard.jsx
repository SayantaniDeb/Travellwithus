import { useEffect, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
export default function LazyCard({children,eager=false,label='Loading day…'}){
 const host=useRef(null),[ready,setReady]=useState(eager);
 useEffect(()=>{
  if(ready)return;
  if(!('IntersectionObserver' in window)){setReady(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'400px'});
  if(host.current)observer.observe(host.current);
  return()=>observer.disconnect();
 },[ready]);
 return <div ref={host} className="lazy-itinerary-card min-w-0" aria-busy={!ready}>{ready?children:<div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><LoadingSpinner label={label}/></div>}</div>;
}
