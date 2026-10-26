import { useEffect, useState } from 'react';
import DestinationAutocomplete from './DestinationAutocomplete';
export default function JourneyDirections({ plan, source, onSourceChange, onGenerate, busy, disabled, message, showControls = true, id = 'journey-directions' }) {
  const [mode, setMode] = useState(plan.travelInfo?.selectedMode || '');
  useEffect(() => setMode(plan.travelInfo?.selectedMode || ''), [plan.travelInfo]);
  const road = ['car', 'bike'].includes(plan.travelInfo?.selectedMode);
  const destination = plan.actualDestination || plan.destination || '';
  const steps = Array.isArray(plan.travelInfo?.steps) ? plan.travelInfo.steps.filter(step => typeof step === 'string') : [];
  return <section id={id} aria-label="Journey directions" aria-busy={busy} className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">How to get there</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{plan.travelInfo ? 'Journey directions and connections for this itinerary.' : plan.includeTravel === false ? 'Transport was not included in this plan. Add directions here.' : 'No journey directions have been saved yet. Add them without regenerating your itinerary.'}</p></div>
      {showControls && <button type="button" onClick={() => onGenerate(mode)} disabled={!source.trim() || disabled || busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Finding directions…' : plan.travelInfo ? 'Refresh travel directions' : 'Add travel directions'}</button>}
    </div>
    {showControls && <><label className="mt-4 block text-xs font-semibold text-slate-600">Travel by<select value={mode} disabled={busy || disabled} onChange={event => setMode(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option value="">Recommend a mode</option><option value="train">Train</option><option value="bus">Bus</option><option value="flight">Flight</option><option value="car">Car</option><option value="bike">Motorbike</option></select></label>
    <p className="mt-2 text-xs text-slate-500">Refresh directions to apply your choice and recalculate journey days. Changes that do not fit your dates will keep the current journey.</p></>}
    {road && <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4"><h3 className="text-sm font-semibold">Road route · {plan.travelInfo.recommendedMode}</h3><p className="mt-2 text-sm">{plan.travelInfo.routeSummary}</p>{Number(plan.travelInfo.distanceKm) > 0 && <p className="mt-2 text-xs">Approximately {plan.travelInfo.distanceKm} km one way · {plan.travelInfo.travelDuration}</p>}<p className="mt-2 text-xs text-slate-500">Costs estimate vehicle fuel and tolls. {plan.travelInfo.selectedMode === 'bike' ? 'The map opens a general driving route. Use two-wheeler routing where available and verify road access before riding.' : 'Check road access, tolls and current conditions before departure.'}</p></div>}
    {!source.trim() && <div className="relative mt-3"><DestinationAutocomplete aria-label="Journey starting city" value={source} onChange={onSourceChange} placeholder="Enter your starting city" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" /></div>}
    {message && <p role="status" className="mt-3 rounded-xl border border-blue-200 bg-white p-3 text-sm leading-relaxed text-slate-700">{message}</p>}
    {plan.travelInfo && <p className="mt-4 text-xs font-semibold text-slate-600">Currently saved: {plan.travelInfo.recommendedMode}{mode && mode !== plan.travelInfo.selectedMode ? ' · New selection has not been applied yet' : ''}</p>}
    {steps.length > 0 && <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}
    {source.trim() && <a className="mt-3 inline-block text-sm font-medium text-blue-700 underline" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}${road ? '&travelmode=driving' : ''}`} target="_blank" rel="noopener noreferrer">Check route and transport options on Google Maps ↗</a>}
    {plan.travelInfo && <p className="mt-3 text-xs leading-relaxed text-slate-500">AI-generated directions and durations are estimates. Confirm connections, timetables and fares with the transport operator.</p>}
  </section>;
}
