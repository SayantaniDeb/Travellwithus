import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Source-owned accordion using shadcn/ui spacing, focus, and chevron patterns.
export default function MobileAccordion({ title, summary, children }) {
  const id = useId();
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return <section className="mobile-trip-accordion">
    {mobile && <h2><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{title}</span>{summary && <span className="mt-1 block text-xs leading-5 text-slate-500">{summary}</span>}</span>
      <ChevronDown aria-hidden="true" size={18} className={`shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}/>
    </button></h2>}
    <div id={id} hidden={mobile && !open} className={mobile ? 'mobile-trip-accordion-content' : ''}>{children}</div>
  </section>;
}
