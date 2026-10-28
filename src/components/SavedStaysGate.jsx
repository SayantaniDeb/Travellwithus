import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

export default function SavedStaysGate({ onBrowse, savedOnly = true }) {
  return <div className="relative min-h-screen trip-page-background stays-background">
    <Navbar/>
    <div aria-hidden="true" className="pointer-events-none mx-auto max-w-2xl space-y-5 px-4 pb-28 pt-28 opacity-40 blur-sm">
      {[0,1,2].map(index => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="h-28 rounded-xl bg-slate-100"/><div className="mt-5 h-3 w-2/3 rounded bg-slate-200"/><div className="mt-3 h-3 w-full rounded bg-slate-100"/></div>)}
    </div>
    <div className="community-access-overlay absolute inset-x-0 bottom-0 top-14 flex items-start justify-center bg-white/40 px-5 pb-28 pt-[min(20vh,160px)] backdrop-blur-md sm:top-16">
      <section aria-labelledby="saved-stays-signin-title" className="community-access-panel w-full max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-7 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><LockKeyhole size={26} aria-hidden="true"/></div>
        <h1 id="saved-stays-signin-title" className="mt-5 text-2xl font-semibold text-slate-900">{savedOnly ? 'Your saved stays await' : 'Find your next stay'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{savedOnly ? 'Sign in to view saved hotels, organize favorites by trip, and choose your stay.' : 'Sign in to search hotels, save favorites, and choose a stay for your trip.'}</p>
        <Link to="/login" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{savedOnly ? 'Sign in to view saved stays' : 'Sign in to explore stays'}</Link>
        <button type="button" onClick={onBrowse} className="mt-3 min-h-11 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Back to Explore</button>
      </section>
    </div>
  </div>;
}
