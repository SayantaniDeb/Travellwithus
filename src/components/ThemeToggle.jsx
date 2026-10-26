import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { readTheme, setTheme, subscribeTheme } from '../utils/theme';
export default function ThemeToggle({ compact = false }) {
  const theme=useSyncExternalStore(subscribeTheme,()=>document.documentElement.classList.contains('dark')?'dark':'light',()=> 'light');
  const label=theme==='dark'?'Switch to light theme':'Switch to dark theme';
  return <button type="button" title={label} aria-label={label} aria-pressed={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')} className={`inline-flex ${compact ? 'h-8 w-8 bg-transparent' : 'h-10 w-10 border border-slate-200 bg-slate-50'} shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>{theme==='dark'?<Sun size={compact ? 14 : 18} aria-hidden="true" />:<Moon size={compact ? 14 : 18} aria-hidden="true" />}</button>;
}
