import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfileIdentity } from '../context/ProfileContext';
import { API_BASE } from '../utils/apiBase';
import { aiFetch } from '../utils/aiFetch';
export const CREDIT_CHANGE='travelwithus:credits';
export default function CreditBadge(){
 const {user}=useProfileIdentity();const [credits,setCredits]=useState(null),[open,setOpen]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!user){setCredits(null);setOpen(false);return;}
  let active=true;
  const load=async()=>{try{const response=await aiFetch(`${API_BASE}/api/credits`);const data=await response.json();if(!response.ok)throw Error(data.detail||'Could not load credits.');if(active){setCredits(data);setError('');}}catch(err){if(active)setError(err.message);}};
  load();window.addEventListener(CREDIT_CHANGE,load);
  try{if(!localStorage.getItem(`credit-notice:${user.uid}:v1`))setOpen(true);}catch{setOpen(true);}
  return()=>{active=false;window.removeEventListener(CREDIT_CHANGE,load);};
 },[user?.uid]);
 const dismiss=()=>{try{localStorage.setItem(`credit-notice:${user.uid}:v1`,'1');}catch{}setOpen(false);};
 if(!user)return null;
 return <><button type="button" onClick={()=>setOpen(true)} aria-label="View AI credits" className="credit-coin fixed bottom-24 right-3 z-[65] flex min-h-14 min-w-14 flex-col items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-800 shadow-lg lg:bottom-5"><Coins size={23} aria-hidden="true"/><span className="mt-0.5 text-[10px] font-bold tabular-nums">{credits?.unlimited?'Unlimited':credits?`${credits.remaining}/${credits.limit}`:'—/5'}</span></button>
 <Dialog open={open} onClose={dismiss} className="relative z-[230]"><div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md" aria-hidden="true"/><div className="fixed inset-0 flex items-center justify-center p-5"><Dialog.Panel className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"><Coins className="text-amber-600" size={32}/><Dialog.Title className="mt-4 text-xl font-semibold">Your daily AI credits</Dialog.Title><Dialog.Description className="mt-3 text-sm leading-6 text-slate-600">{credits?.unlimited ? 'Your admin account has unlimited AI credits. Stay searches and planning requests do not deduct credits, and there is no daily app credit limit.' : 'You get 5 free AI credits each day. An AI stay search or planning request uses one credit. Manual editing, saving, and viewing are free. Credits reset at midnight IST; unused credits do not roll over.'}</Dialog.Description>{credits&&<p className="mt-4 font-semibold text-amber-700">{credits.unlimited?'Admin account · unlimited credits':`${credits.remaining} of ${credits.limit} credits remaining today`}</p>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!credits?.unlimited && <p className="mt-3 text-xs leading-5 text-slate-500">Extra credits granted by an admin last until today’s reset. Failed provider requests are refunded.</p>}{credits?.unlimited&&<Link to="/admin/users" onClick={dismiss} className="mt-4 block text-sm font-semibold text-blue-700">Manage users and credits →</Link>}<button onClick={dismiss} className="mt-5 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Okay, got it</button></Dialog.Panel></div></Dialog></>;
}
