import { ArrowRight, MapPin } from 'lucide-react';
import DayCostEstimate from './DayCostEstimate';
import TravelDayCost from './TravelDayCost';
import { itineraryDayLabel } from '../utils/dayLabels';
import { travelActivityTitle } from '../utils/travelSchedule';
const periods = ['morning', 'afternoon', 'evening'];
const icons = {morning:'☀',afternoon:'◐',evening:'☾'};
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '';
export function DeviceDayGrid({trip, onOpen}) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{trip.days?.map((day,index) => <button type="button" key={day.date || index} onClick={() => onOpen(index)} className={`itinerary-preview-card group min-w-0 rounded-2xl border p-4 text-left transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${day.travelReservation ? 'border-yellow-300 bg-yellow-50' : 'border-zinc-200/60 bg-white/80'}`}>
    <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white">{itineraryDayLabel(trip.days,day)}</span><span className="text-xs text-slate-400">{dateLabel(day.date)}</span></div>
    <h3 className="font-semibold text-slate-900">{day.title || `Day ${index+1}`}</h3>{day.summary && <p className="mb-3 mt-2 line-clamp-2 text-sm text-slate-500">{day.summary}</p>}
    <div className="space-y-2">{periods.map(period => <div key={period} className="flex items-center gap-2 text-xs text-slate-500"><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icons[period]}</span><span className="truncate">{travelActivityTitle(day,period)}</span></div>)}</div>
    <TravelDayCost plan={trip} day={day}/><DayCostEstimate day={day} currency={trip.currency}/>
    <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">View day <ArrowRight size={14}/></span>
  </button>)}</div>;
}
export function DeviceDayDetail({trip, index, onBack}) {
 const day=trip.days[index];
 return <div className="mx-auto max-w-2xl">
  <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"><span className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white">{itineraryDayLabel(trip.days,day)}</span><p className="mt-3 text-xs text-slate-500">{dateLabel(day.date)}</p><h1 className="mt-2 text-2xl font-semibold">{day.title || itineraryDayLabel(trip.days,day)}</h1>{day.summary && <p className="mt-3 text-sm leading-6 text-slate-500">{day.summary}</p>}</header>
  <div className="space-y-4">{periods.map(period => {const activity=day[period];return <div key={period}>
   {period==='evening' && day.meals?.dinner && <Meal name="Dinner" text={day.meals.dinner}/>}
   <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600" aria-hidden="true">{icons[period]}</span><h2 className="font-semibold capitalize">{period}</h2></div><h3 className="font-medium">{travelActivityTitle(day,period)}</h3>{activity?.description && <p className="mt-2 text-sm leading-6 text-slate-500">{activity.description}</p>}{activity?.location && <p className="mt-3 flex items-start gap-1 text-xs text-slate-500"><MapPin size={14} className="shrink-0"/>{activity.location}</p>}{activity?.estimatedCost != null && <p className="mt-3 text-sm text-emerald-700">{activity.estimatedCost}</p>}</article>
   {period==='morning' && day.meals?.lunch && <Meal name="Lunch" text={day.meals.lunch}/>}
  </div>;})}<section className="rounded-2xl border border-slate-200 bg-white p-5"><TravelDayCost plan={trip} day={day}/><DayCostEstimate day={day} currency={trip.currency}/></section></div>
 </div>;
}
function Meal({name,text}) {return <section className={`meal-card meal-card-${name.toLowerCase()} ${name==='Lunch'?'mt-4':'mb-4'} rounded-2xl border border-rose-100 bg-rose-50 p-4`}><p className="text-xs font-semibold uppercase text-rose-600">{name}</p><p className="mt-1 text-sm text-slate-700">{text}</p></section>;}
