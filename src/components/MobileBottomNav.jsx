import { Link, useLocation } from 'react-router-dom';
import { MagnifyingGlassIcon, CalendarDaysIcon, BuildingOfficeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const primary = [
  { name: 'Explore', href: '/home', icon: MagnifyingGlassIcon },
  { name: 'Trips', href: '/saved-trips', icon: CalendarDaysIcon },
  { name: 'Stays', href: '/hotels', icon: BuildingOfficeIcon },
];
const secondary = [
  { name: 'Community', href: '/community', icon: ChatBubbleLeftRightIcon },
];
export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const active = item => pathname === item.href || (item.name === 'Stays' && pathname === '/shortlist');
  const itemClass = selected => `flex min-h-14 min-w-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${selected ? 'text-blue-700 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`;
  return <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
    <div className="mx-auto flex max-w-3xl overflow-x-auto px-1 py-1">
      {[...primary, ...secondary].map(item => <Link key={item.href} to={item.href} aria-current={active(item) ? 'page' : undefined} className={itemClass(active(item))}><item.icon aria-hidden="true" className="h-5 w-5" /><span>{item.name}</span></Link>)}
    </div>
  </nav>;
}
