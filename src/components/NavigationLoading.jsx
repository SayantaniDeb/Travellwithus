import { useEffect, useState } from 'react';
import { useLocation, useNavigation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

export function LoadingOverlay({ label = 'Opening your next stop…' }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 px-6 backdrop-blur-sm" aria-busy="true">
    <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-2xl"><LoadingSpinner label={label}/></div>
  </div>;
}

export default function NavigationLoading() {
  const location = useLocation();
  const navigation = useNavigation();
  const [clicked, setClicked] = useState(false);
  useEffect(() => { setClicked(false); }, [location.key]);
  useEffect(() => {
    const start = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin || (next.pathname === location.pathname && next.search === location.search)) return;
      setClicked(true);
    };
    const reset = () => setClicked(false);
    document.addEventListener('click', start, true);
    window.addEventListener('pageshow', reset);
    return () => { document.removeEventListener('click', start, true); window.removeEventListener('pageshow', reset); };
  }, [location.pathname, location.search]);
  return clicked || navigation.state !== 'idle' ? <LoadingOverlay/> : null;
}
