import DestinationAutocomplete from './DestinationAutocomplete';
import { useLocation } from '../context/LocationContext';
import { addDays, daysBetween, localDate } from '../utils/tripDates';
import { ArrowRightIcon, MapPinIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', weekday: 'short' });

function EditableDate({ label, value, min, max, onChange }) {
  return (
    <label className="trip-date-control relative block cursor-pointer rounded-xl px-3 py-2 transition hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <span className="mt-1 flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
        {dateLabel(value)}<CalendarDaysIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
      </span>
      <input type="date" aria-label={`Change ${label.toLowerCase()} date`} title={`Change ${label.toLowerCase()} date`}
        value={value} min={min} max={max} className="trip-date-picker absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* Use the native date input when programmatic opening is unavailable. */ } }}
        onChange={event => { if (event.target.value) onChange(event.target.value); }} />
    </label>
  );
}

function Slider({ id, label, min, max, value, step = 1, onChange, valueText }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <input id={id} aria-label={label} aria-valuetext={valueText} type="range" min={min} max={max} step={step} value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="trip-setup-slider w-full cursor-pointer"
      style={{ '--slider-progress': `${Math.max(0, Math.min(100, progress))}%` }} />
  );
}

export default function TripSetupForm({ destination, destinationProvided = false, setDestination, sourceLocation, setSourceLocation, startDate, setStartDate,
  endDate, setEndDate, budgetAmount, setBudgetAmount, currency, setCurrency, currencies,
  includeHotels, setIncludeHotels, includeTravel, setIncludeTravel, loading, error, onGenerate }) {
  const { locationName, requestLocation, loading: locating, error: locationError } = useLocation();
  const today = localDate();
  const departure = startDate || today;
  const duration = Math.max(1, Math.min(30, endDate ? daysBetween(departure, endDate) + 1 : 4));
  const symbol = currencies[currency]?.symbol || '$';
  const amount = Number(budgetAmount) || 0;
  const budgetMax = Math.max(currency === 'INR' ? 200000 : 10000, amount);
  const budgetStep = currency === 'INR' ? 500 : 50;
  const changeDeparture = value => {
    setStartDate(value);
    setEndDate(addDays(value, duration - 1));
  };
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50';

  return (
    <form onSubmit={event => { event.preventDefault(); onGenerate(); }} className="trip-setup flex flex-col overflow-visible rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="trip-setup-content">
      <header className="rounded-t-3xl border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6 sm:py-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Trip details</p>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">{destinationProvided ? <>Your trip to <span className="font-serif font-normal">{destination}</span></> : 'Plan your next trip'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Choose your route, dates, and budget.</p>
        <div className={`mt-5 grid min-w-0 grid-cols-1 items-start gap-4 ${destinationProvided ? '' : 'sm:grid-cols-2'}`}>
          {!destinationProvided && <div className="min-w-0">
            <div className="mb-2 flex min-h-[28px] items-center">
              <label htmlFor="trip-destination" className="text-sm font-semibold text-slate-900">Destination</label>
            </div>
            <div className="relative">
              <DestinationAutocomplete id="trip-destination" aria-label="Destination" value={destination} onChange={setDestination} placeholder="Where do you want to go?" className={fieldClass} maxLength={120} />
            </div>
          </div>}
          <section aria-labelledby="departure-heading" className="min-w-0">
            <div className="mb-2 flex min-h-[28px] items-center justify-between gap-2">
              <label id="departure-heading" htmlFor="trip-origin" className="text-sm font-semibold text-slate-900">Traveling from</label>
              <button type="button" disabled={locating} onClick={async () => { const name = locationName || await requestLocation(); if (name) setSourceLocation(name); }}
                aria-label="Use my location as the starting point" title="Use my location"
                className="inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-xs font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                <MapPinIcon aria-hidden="true" className="h-3.5 w-3.5" />{locating ? 'Locating…' : 'Locate me'}
              </button>
            </div>
            <div className="relative">
              <DestinationAutocomplete id="trip-origin" aria-label="Traveling from" value={sourceLocation} onChange={setSourceLocation} placeholder="Search a city or town" className={fieldClass} maxLength={120} />
            </div>
            {locationError && <p role="status" className="mt-2 text-xs text-amber-700">{locationError}. You can enter your starting point above.</p>}
          </section>
        </div>
      </header>
      <div className="space-y-5 px-5 py-4 sm:px-6 sm:py-5">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}


        <section aria-labelledby="dates-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="dates-heading" className="text-sm font-semibold text-slate-900">When are you going?</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-50 p-1">
            <EditableDate label="Departure" value={departure} min={today} onChange={changeDeparture} />
            <EditableDate label="Return" value={endDate || addDays(departure, duration - 1)} min={departure} max={addDays(departure, 29)} onChange={setEndDate} />
          </div>

        </section>

        <section aria-labelledby="budget-heading" className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="budget-heading" className="text-sm font-semibold text-slate-900">Your total budget</h2>
            <select aria-label="Budget currency" value={currency} onChange={event => setCurrency(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700">
              {Object.entries(currencies).map(([code, data]) => <option key={code} value={code}>{data.symbol} {code}</option>)}
            </select>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5"><span className="text-2xl text-slate-400">{symbol}</span><input aria-label="Total trip budget amount" type="number" min="0" step="1" inputMode="numeric" value={budgetAmount} onChange={event => setBudgetAmount(event.target.value)} placeholder="0" className="trip-budget-amount min-w-0 rounded-md border border-transparent bg-transparent px-1 font-semibold tracking-tight text-slate-950 hover:border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ width: `${Math.max(4, String(budgetAmount).length + 1)}ch`, maxWidth: '60%' }} /><span className="ml-2 text-xs text-slate-400">for the whole trip</span></div>
          <Slider id="budget-slider" label="Total trip budget" min={0} max={budgetMax} step={budgetStep} value={amount} valueText={`${amount} ${currency}`} onChange={value => setBudgetAmount(value === 0 ? '' : String(value))} />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Flexible</span><span>{symbol}{budgetMax.toLocaleString()}+</span></div>

        </section>

        <fieldset className="border-t border-slate-100 pt-4">
          <legend className="sr-only">Include estimates</legend>
          <p className="mb-3 text-xs font-medium text-slate-500">Include estimates for</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ label: 'Accommodation', description: 'Hotels and places to stay', checked: includeHotels, change: setIncludeHotels }, { label: 'Transportation', description: 'Getting there and around', checked: includeTravel, change: setIncludeTravel }].map(option => (
              <label key={option.label} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${option.checked ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
                <input type="checkbox" checked={option.checked} onChange={event => option.change(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                <span><span className="block text-sm font-medium text-slate-800">{option.label}</span><span className="block text-[11px] text-slate-500">{option.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      </div>
        <div className="trip-setup-footer shrink-0 rounded-b-3xl border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <button type="submit" disabled={loading || !destination.trim() || !startDate || !endDate || startDate < today || endDate < startDate || daysBetween(startDate, endDate) >= 30 || Number(budgetAmount) < 0} className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
            {loading ? 'Generating your plan…' : 'Generate my plan'}<ArrowRightIcon className="h-4 w-4" />
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">You can refresh any day or activity after your plan is ready.</p>
        </div>
    </form>
  );
}
