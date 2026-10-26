import TravelDayCost from './TravelDayCost';
import { travelActivityTitle } from '../utils/travelSchedule';

export default function TravelDayActivities({ plan, day, onRefresh, busy }) {
  const journey = day.travelReservation;
  return <section className="space-y-4">
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{journey.journeyId === 'return' ? 'Return travel' : 'Onward travel'} · {journey.mode}</p><p className="mt-2 font-semibold text-slate-900">{journey.from} → {journey.to}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">Travel time is reserved. These are flexible journey suggestions, not a confirmed departure or arrival schedule.</p></div>
    {['morning', 'afternoon', 'evening'].map((period, index) => <article key={period} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{period} · suggestion {index + 1}</span><button disabled={busy} onClick={() => onRefresh(period)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">↻ New idea</button></div><h2 className="mt-3 text-lg font-semibold text-slate-900">{travelActivityTitle(day, period)}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{day[period]?.description}</p></article>)}
    <TravelDayCost plan={plan} day={day} />
    {day.meals && <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Meals during the journey</summary><div className="mt-3 space-y-2 text-sm text-slate-600">{['breakfast','lunch','dinner'].map(meal => typeof day.meals[meal] === 'string' && <p key={meal}><span className="capitalize font-medium">{meal}: </span>{day.meals[meal]}</p>)}</div></details>}
  </section>;
}
