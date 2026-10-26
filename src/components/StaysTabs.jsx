import { NavLink, useLocation } from 'react-router-dom';
export default function StaysTabs() {
  const location = useLocation();
  return <nav aria-label="Stays sections" className="mb-5 flex rounded-xl border border-slate-200 bg-white p-1">
    {[['/hotels', 'Find stays'], ['/shortlist', 'Saved stays']].map(([to, label]) => <NavLink key={to} to={to} state={location.state} className={({isActive}) => `flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</NavLink>)}
  </nav>;
}
