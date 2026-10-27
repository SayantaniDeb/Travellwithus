import { useState } from 'react';
import Spinner from './Spinner';

// Key the inner image by source so a replacement photo starts in its own loading state.
export default function LoadingImage(props) {
  return <ImageWithStatus key={props.src} {...props}/>;
}
function ImageWithStatus({ className = '', alt, onLoad, onError, ...props }) {
  const [status, setStatus] = useState('loading');
  return <div className={`relative overflow-hidden ${className}`} aria-busy={status === 'loading'}>
    <img {...props} alt={alt} className="h-full max-h-[inherit] w-full rounded-[inherit] object-contain" onLoad={event => { setStatus('ready'); onLoad?.(event); }} onError={event => { setStatus('error'); onError?.(event); }}/>
    {status === 'loading' && <div role="status" className="absolute inset-0 flex min-h-12 items-center justify-center bg-slate-100/70 text-blue-600 dark:bg-slate-800/70"><Spinner className="h-5 w-5"/><span className="sr-only">Loading photo…</span></div>}
    {status === 'error' && <div role="status" className="absolute inset-0 flex items-center justify-center bg-slate-100 p-2 text-xs text-slate-500 dark:bg-slate-800">Photo unavailable</div>}
  </div>;
}
