import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { HardDrive, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfileIdentity } from '../context/ProfileContext';
import { GUEST_TRIPS_CHANGED, listGuestTrips, listGuestTodos } from '../utils/guestTrips';

export default function DeviceSaveNotice() {
  const { user } = useProfileIdentity();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async event => {
      try {
        const [trips,todos] = await Promise.all([listGuestTrips(),listGuestTodos()]);
        if (!active) return;
        setCount(trips.length + todos.length);
        if (event?.detail?.saved && (trips.length || todos.length) && !user) {
          let seen = false;
          try { seen = localStorage.getItem('device-save-notice-seen') === '1'; localStorage.setItem('device-save-notice-seen', '1'); } catch { /* Storage can be restricted independently of IndexedDB. */ }
          if (!seen) setOpen(true);
        }
      } catch { /* The actual save reports storage errors; no warning before saving. */ }
    };
    refresh(); window.addEventListener(GUEST_TRIPS_CHANGED, refresh);
    return () => { active = false; window.removeEventListener(GUEST_TRIPS_CHANGED, refresh); };
  }, [user?.uid]);
  async function sync() {
    setBusy(true); setMessage('');
    try {
      const [{ db }, { doc, collection, writeBatch, serverTimestamp, getDoc }] = await Promise.all([import('../firebaseDatabase'), import('firebase/firestore')]);
      const trips = await listGuestTrips();
      for (const trip of trips) {
        // Stable document IDs make retrying safe. Keep the local copy until the user deletes it.
        const { id, draftExpenses = [], ...data } = trip;
        const ref = doc(db, 'users', user.uid, 'trips', id);
        if ((await getDoc(ref)).exists()) continue;
        const batch = writeBatch(db);
        batch.set(ref, { ...data, createdAt: new Date(trip.createdAt), updatedAt: serverTimestamp() });
        for (const expense of draftExpenses) {
          const { id: expenseId, ...fields } = expense;
          batch.set(doc(collection(ref, 'expenses'), expenseId), fields);
        }
        await batch.commit();
      }
      for (const todo of await listGuestTodos()) {
        const {id,...data}=todo;const ref=doc(db,'users',user.uid,'todos',id);
        if ((await getDoc(ref)).exists()) continue;
        const batch=writeBatch(db);batch.set(ref,{...data,createdAt:new Date(todo.createdAt)});await batch.commit();
      }
      setMessage('Device trips and checklist tasks copied to your account. Your local backup is still here.');
    } catch { setMessage('Could not copy all trips. Your device copies are safe. Check your connection and retry.'); }
    finally { setBusy(false); }
  }
  if (!count) return null;
  return <>
    <button onClick={() => setOpen(true)} aria-label={user ? 'Device trips and backup options' : 'Saved locally: view storage warning'} className="device-save-indicator fixed bottom-24 left-3 z-[60] inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-lg lg:bottom-5"><HardDrive size={16} aria-hidden="true"/>{user ? 'Device trips' : 'Saved locally'}</button>
    <Transition show={open} as={Fragment}><Dialog onClose={() => { if (!busy) setOpen(false); }} className="relative z-[210]">
      <Transition.Child as={Fragment} enter="transition-opacity duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"/></Transition.Child>
      <Transition.Child as={Fragment} enter="transform transition duration-300 motion-reduce:transition-none" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition duration-200 motion-reduce:transition-none" leaveFrom="translate-x-0" leaveTo="translate-x-full"><Dialog.Panel className="fixed inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
        <button disabled={busy} aria-label="Close storage information" onClick={() => setOpen(false)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200"><X size={20}/></button>
        <HardDrive className="mt-6 text-amber-600" size={28}/><Dialog.Title className="mt-4 text-xl font-semibold">{user ? 'Back up your device trips' : 'Saved on this device'}</Dialog.Title>
        <Dialog.Description className="mt-3 text-sm leading-6 text-slate-600">Your trips and checklist tasks are stored in this browser. Normal refreshes and browser restarts keep them. Clearing site data, private browsing, or losing this device may remove them. They won’t appear automatically on other devices.</Dialog.Description>
        <p className="mt-4 text-sm leading-6 text-slate-600">{user ? 'Copy these trips to your account to access them on other devices.' : 'Sign in with email or Google, then copy your device trips to your account. Signing in alone does not upload them.'}</p>
        <div className="mt-6 flex flex-col gap-3">{user ? <button disabled={busy} onClick={sync} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Copying trips…' : 'Copy saved items to my account'}</button> : <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Sign in to back up trips</Link>}
          <Link to="/Todolist" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium">View checklists</Link>
          <Link to="/saved-trips?device=1" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium">View device trips</Link>
          <button disabled={busy} onClick={() => setOpen(false)} className="px-4 py-3 text-sm text-slate-600">Keep using this device</button>
        </div>{message && <p role="status" className="mt-4 text-sm leading-6">{message}</p>}
      </Dialog.Panel></Transition.Child>
    </Dialog></Transition>
  </>;
}
