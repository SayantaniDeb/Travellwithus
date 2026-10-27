import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from './ui/form-controls';

export default function FeatureNavigation({ features }) {
  const [active, setActive] = useState(0);
  const [inFeatures, setInFeatures] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const frame = useRef(0);
  useEffect(() => {
    const update = () => {
      frame.current = 0;
      setShowTop(window.scrollY > 400);
      const section = document.getElementById('home-features');
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      setInFeatures(bounds.top < window.innerHeight * .55 && bounds.bottom > 160);
      const focus = window.innerHeight * .4;
      let closest = 0, distance = Infinity;
      features.forEach((feature, index) => {
        const element = document.getElementById(`feature-${feature.id}`);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const next = Math.abs(rect.top + rect.height / 2 - focus);
        if (next < distance) { distance = next; closest = index; }
      });
      setActive(closest);
    };
    const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame.current); };
  }, [features]);
  const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  return <>
    {inFeatures && <nav aria-label="Feature sections" className="feature-section-nav fixed right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg sm:right-4">
      {features.map((feature, index) => <Button key={feature.id} aria-label={`${index + 1}. ${feature.name}`} aria-current={active === index ? 'location' : undefined} title={feature.name} className={`feature-nav-number !h-8 !w-8 !rounded-lg !p-0 !text-xs ${active === index ? 'feature-nav-number-active' : 'feature-nav-number-idle'}`} onClick={() => document.getElementById(`feature-${feature.id}`)?.scrollIntoView({ behavior: behavior(), block: 'center' })}>{index + 1}</Button>)}
    </nav>}
    {showTop && <Button aria-label="Back to top" title="Back to top" className="fixed bottom-24 right-3 z-40 !w-11 !rounded-full !p-0 shadow-lg sm:bottom-6 sm:right-5" onClick={() => window.scrollTo({ top: 0, behavior: behavior() })}><ArrowUp size={19} aria-hidden="true"/></Button>}
  </>;
}
