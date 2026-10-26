import { useEffect, useRef, useState } from 'react';
import Lottie from 'react-lottie-player';
import { Pause, Play } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

export default function LegacyCarHero() {
  const container = useRef(null);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const controller = new AbortController();
    fetch('https://assets3.lottiefiles.com/packages/lf20_bhebjzpu.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Animation unavailable'); return response.json(); })
      .then(setData).catch(error => { if (error.name !== 'AbortError') setFailed(true); });
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => { controller.abort(); observer.disconnect(); };
  }, []);
  return <div ref={container} className="absolute inset-0">
    {data ? <div aria-hidden="true" className="pointer-events-none h-full w-full"><Lottie animationData={data} play={!paused && visible} loop rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }} style={{ width: '100%', height: '100%' }}/></div> : !failed && <div className="absolute inset-x-0 bottom-12"><LoadingSpinner label="Loading travel animation…"/></div>}
    {data && <button type="button" onClick={() => setPaused(value => !value)} className="absolute right-4 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600">{paused ? <Play size={12}/> : <Pause size={12}/>} {paused ? 'Play motion' : 'Pause motion'}</button>}
  </div>;
}
