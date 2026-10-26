import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { CloudSun, LoaderCircle, RefreshCw, X, LocateFixed } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DestinationAutocomplete from './DestinationAutocomplete';
import { useLocation as useDeviceLocation } from '../context/LocationContext';
import { useWeather } from '../context/WeatherContext';
export default function WeatherBadge(){
 const {requestLocation,loading:locating,error:locationError}=useDeviceLocation();
 const {city,weather,loading,error,chooseCity,refresh,hasLocation}=useWeather();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(city);
 const button=useRef(null),id=useId();const route=useLocation(),navigate=useNavigate();
 useEffect(()=>{if(open)setQuery(city);},[open,city]);
 useEffect(()=>{
  if(new URLSearchParams(route.search).get('weather')!=='1'||!button.current?.getClientRects().length)return;
  setOpen(true);const params=new URLSearchParams(route.search);params.delete('weather');navigate({pathname:route.pathname,search:params.toString()},{replace:true});
 },[route.pathname,route.search,navigate]);
 const label=weather?`${weather.temperature}°C ${weather.city}`:loading?'Loading weather':'Choose weather city';
 return <><button ref={button} type="button" onClick={()=>setOpen(true)} aria-label={label} aria-haspopup="dialog" aria-expanded={open} title={label} className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-1.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{loading?<LoaderCircle size={16} className="animate-spin"/>:<CloudSun size={16} aria-hidden="true"/>}{weather&&<span className="flex max-w-[60px] flex-col text-left leading-tight sm:max-w-[140px] sm:flex-row sm:gap-1"><span className="whitespace-nowrap">{weather.temperature}°C</span><span className="truncate">{weather.city}</span></span>}</button>
 <Dialog open={open} onClose={setOpen} className="relative z-[110]">
  <div className="fixed inset-0 bg-slate-900/25" aria-hidden="true"/>
  <div className="fixed inset-x-3 top-16 mx-auto max-h-[calc(100dvh-6rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:left-auto sm:right-5 sm:mx-0 sm:w-80">
   <div className="mb-4 flex items-center justify-between"><Dialog.Title className="flex items-center gap-2 font-serif text-xl font-bold"><CloudSun size={22} className="text-blue-600"/>Weather</Dialog.Title><button type="button" onClick={()=>setOpen(false)} aria-label="Close weather" className="rounded-full p-2 hover:bg-slate-100"><X size={18}/></button></div>
   <form onSubmit={event=>{event.preventDefault();chooseCity(query);}}><label htmlFor={id} className="text-sm font-medium">{weather?'Change city':'Which city’s weather would you like?'}</label><div className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><DestinationAutocomplete placesOnly preferredCountry={weather?.country ? new Intl.DisplayNames(['en'], {type:'region'}).of(weather.country) : ''} aria-label="Weather city" id={id} value={query} onChange={setQuery} placeholder="City, e.g. Agra, India" maxLength={120} required className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><button type="submit" disabled={loading||!query.trim()} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Show</button></div></form>
   <button type="button" disabled={locating||loading} onClick={async()=>{const name=await requestLocation();if(name&&name!=='Unknown'){setQuery(name);chooseCity(name);}}} className="mt-3 inline-flex items-center gap-2 rounded-md px-1 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><LocateFixed size={15} aria-hidden="true"/>{locating?'Finding your location…':'Use my location'}</button>
   {locationError&&<p role="status" className="mt-1 text-xs text-amber-700">{locationError}. You can search for a city instead.</p>}
   {loading&&<p role="status" className="mt-4 text-sm text-slate-500">Getting current weather…</p>}
   {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {weather&&<div className="mt-4 rounded-xl bg-blue-50 p-4"><p className="text-sm font-semibold">{weather.city}{weather.country?`, ${weather.country}`:''}</p><p className="mt-1 text-4xl font-bold">{weather.temperature}°C</p><p className="mt-2 text-sm capitalize text-slate-600">{weather.description}</p><div className="mt-3 flex gap-4 text-xs text-slate-600">{Number.isFinite(weather.humidity)&&<span>Humidity {weather.humidity}%</span>}{Number.isFinite(weather.wind)&&<span>Wind {weather.wind} m/s</span>}</div><button type="button" onClick={refresh} disabled={loading} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><RefreshCw size={13}/>Refresh</button></div>}
   {!city&&!hasLocation&&!weather&&!loading&&<Dialog.Description className="mt-4 text-xs text-slate-500">Choose a city once to keep its temperature in your top bar.</Dialog.Description>}
   {weather&&<p className="mt-3 text-[11px] text-slate-500">Current conditions · refreshes every 30 minutes{weather.provider==='Open-Meteo'&&<> · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">Weather by Open-Meteo</a></>}</p>}
  </div>
 </Dialog></>;
}
