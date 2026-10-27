import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

// Source-owned shadcn/ui patterns, adapted to this app's Tailwind 3 palette.
const control = 'flex h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-500 sm:text-sm';

export const Input = forwardRef(function Input({ className = '', type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} className={`${control} ${className}`} {...props} />;
});

export function Label({ className = '', ...props }) {
  return <label className={`text-sm font-medium leading-none text-slate-700 ${className}`} {...props} />;
}

export const NativeSelect = forwardRef(function NativeSelect({ className = '', children, ...props }, ref) {
  return <div className="relative min-w-0"><select ref={ref} className={`${control} native-select-control appearance-none pr-10 ${className}`} {...props}>{children}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" /></div>;
});

export function Button({ className = '', type = 'button', ...props }) {
  return <button type={type} className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`} {...props} />;
}
