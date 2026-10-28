import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
export default function FeatureImage({ className, alt, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className={`relative ${className}`} style={{ aspectRatio: '482 / 300' }}>
    {!loaded && <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">{failed ? <p className="px-4 text-center text-sm text-slate-500">Preview unavailable</p> : <LoadingSpinner compact label="Loading preview…"/>}</div>}
    <img {...props} alt={alt} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`h-full w-full rounded-2xl transition-opacity duration-200 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}/>
  </div>;
}
