import { RefreshCw } from 'lucide-react';

export default function DayRefreshButton({ day, busy, disabled, onClick }) {
  const label = busy ? `Refreshing day ${day.day}` : day.travelReservation ? `Refresh onboard ideas for day ${day.day}` : `Refresh day ${day.day}`;
  return <button type="button" title={label} aria-label={label} aria-busy={busy} disabled={disabled} onClick={event => { event.stopPropagation(); onClick(); }} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-40"><RefreshCw aria-hidden="true" size={18} strokeWidth={1.8} className={busy ? 'motion-safe:animate-spin' : ''} /></button>;
}
