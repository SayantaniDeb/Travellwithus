import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from './LocationContext';
const WeatherContext=createContext(null);
const API_URL=import.meta.env.VITE_API_URL||'';
const KEY='travelwithus-weather-city';
const FRESH_FOR = 30 * 60 * 1000;
const weatherCache = new Map();
const inFlight = new Map();
async function fetchWeather(key) {
 if (inFlight.has(key)) return inFlight.get(key);
 const request = (async () => {
  const response = await fetch(`${API_URL}/api/weather?${key}`);
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Weather is unavailable. Please try again.');
  const result = normalizeWeather(data);
  weatherCache.set(key, result);
  return result;
 })();
 inFlight.set(key, request);
 try { return await request; } finally { inFlight.delete(key); }
}
export function normalizeWeather(data){
 if(!data?.name||!Number.isFinite(data?.main?.temp))throw new Error(data?.cod==='404'||data?.cod===404?'City not found. Try a city and country.':'Weather is unavailable. Please try again.');
 return {provider:data.provider||'OpenWeather',city:data.name,country:data.sys?.country||'',temperature:Math.round(data.main.temp-273.15),description:data.weather?.[0]?.description||'',humidity:data.main.humidity,wind:data.wind?.speed,updatedAt:Date.now()};
}
export function WeatherProvider({user,children}){
 const {location}=useLocation();
 const [city,setCity]=useState(()=>{try{return localStorage.getItem(KEY)||'';}catch{return '';}});
 const [weather,setWeather]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const latitude=location?.latitude,longitude=location?.longitude;
 const lookupKey = city ? new URLSearchParams({q:city}).toString() : Number.isFinite(latitude) && Number.isFinite(longitude) ? new URLSearchParams({lat:String(latitude),lon:String(longitude)}).toString() : '';
 useEffect(()=>{
  if(!user || !lookupKey){setWeather(null);setLoading(false);setError('');return;}
  let active=true;
  const cached = weatherCache.get(lookupKey);
  setWeather(cached || null);
  setError('');
  const load=async()=>{
   if(active){setLoading(true);setError('');}
   try { const result=await fetchWeather(lookupKey); if(active)setWeather(result); }
   catch(err){if(active)setError(err.message||'Could not load weather.');}
   finally{if(active)setLoading(false);}
  };
  const fresh = cached && Date.now() - cached.updatedAt < FRESH_FOR;
  if(!fresh || revision>0) load(); else setLoading(false);
  const delay = fresh ? Math.max(1000, FRESH_FOR - (Date.now() - cached.updatedAt)) : FRESH_FOR;
  let timer;
  const first = setTimeout(()=>{ load(); timer=setInterval(load,FRESH_FOR); },delay);
  return()=>{active=false;clearTimeout(first);clearInterval(timer);};
 },[user?.uid,lookupKey,revision]);
 const chooseCity=value=>{const next=value.trim();if(!next)return;try{localStorage.setItem(KEY,next);}catch{}setCity(next);setRevision(n=>n+1);};
 return <WeatherContext.Provider value={{city,weather,loading,error,chooseCity,refresh:()=>setRevision(n=>n+1),hasLocation:Number.isFinite(latitude)}}>{children}</WeatherContext.Provider>;
}
export const useWeather=()=>useContext(WeatherContext);
