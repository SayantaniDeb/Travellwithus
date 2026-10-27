import { useSyncExternalStore } from 'react';
import { Lightbulb } from 'lucide-react';
import { setTheme, subscribeTheme } from '../utils/theme';

export default function ThemeToggle({ compact = false }) {
  const theme = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains('dark') ? 'dark' : 'light', () => 'light');
  const lit = theme === 'light';
  const label = lit ? 'Switch to dark theme' : 'Switch to light theme';
  return <button type="button" title={label} aria-label={label} aria-pressed={lit}
    onClick={() => setTheme(lit ? 'dark' : 'light')}
    className={`inline-flex ${compact ? 'h-8 w-8 bg-transparent' : 'h-10 w-10 border border-slate-200 bg-slate-50'} shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
    <Lightbulb size={compact ? 16 : 18} aria-hidden="true" className={lit ? 'fill-amber-200 text-amber-600' : 'text-slate-400'} />
  </button>;
}
