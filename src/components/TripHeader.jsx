import { PencilLine, RefreshCw, Wallet, Hotel, Trash2, Route, Bookmark, Settings2, ClipboardList } from 'lucide-react';
import { Children, cloneElement, isValidElement } from 'react';
import { cleanLocationName } from '../utils/locationName';

const formatDate = value => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';

export default function TripHeader({ destination, source, summary, startDate, endDate, dayCount, budget, currency, symbol = '₹', saved = false, children }) {
  const origin = cleanLocationName(source);
  const base = 'inline-flex h-11 shrink-0 gap-2 min-w-11 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-medium leading-snug transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
  return <header className="mb-6 min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">{saved ? 'Saved itinerary' : 'Your itinerary'}</p>
    {origin && <p className="mt-4 break-words text-sm text-slate-500">From {origin}</p>}
    <h1 className="mt-1 break-words font-serif text-3xl leading-tight tracking-tight text-slate-950 sm:text-4xl">{destination}</h1>
    {summary && <p className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-slate-500">{summary}</p>}
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
      {startDate && <span>{formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ''}</span>}
      {dayCount > 0 && <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>}
      {Number(budget) > 0 && <span>Budget: {symbol}{Number(budget).toLocaleString()}{currency ? ` ${currency}` : ''}</span>}
    </div>
    <div className="mt-5 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        const variant = child.props['data-variant'];
        const tone = variant === 'danger' ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50' : index === 0 ? 'bg-blue-600 font-semibold text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
        const textOf = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(textOf).join('') : isValidElement(value) ? textOf(value.props.children) : '';
        const label = textOf(child.props.children).trim();
        const Icon = /checklist|list/i.test(label) ? ClipboardList : /delete/i.test(label) ? Trash2 : /refresh|regenerat/i.test(label) ? RefreshCw : /edit.*budget/i.test(label) ? PencilLine : /track.*budget/i.test(label) ? Wallet : /stay|hotel/i.test(label) ? Hotel : /get there/i.test(label) ? Route : /save|saved/i.test(label) ? Bookmark : Settings2;
        return cloneElement(child, { className: `${base} ${tone}`, 'aria-label': child.props['aria-label'] || label, title: label, children: <><Icon aria-hidden="true" size={17} className="shrink-0" /><span className={/track.*budget/i.test(label) ? 'whitespace-nowrap' : 'hidden whitespace-nowrap lg:inline'}>{child.props.children}</span></> });
      })}
    </div>
  </header>;
}
