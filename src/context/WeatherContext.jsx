import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from './LocationContext';
const WeatherContext=createContext(null);
const API_URL=import.meta.env.VITE_API_URL||'';
const KEY='travelwithus-weather-city';
export function normalizeWeather(data){
 if(!data?.name||!Number.isFinite(data?.main?.temp))throw new Error(data?.cod==='404'||data?.cod===404?'City not found. Try a city and country.':'Weather is unavailable. Please try again.');
 return {provider:data.provider||'OpenWeather',city:data.name,country:data.sys?.country||'',temperature:Math.round(data.main.temp-273.15),description:data.weather?.[0]?.description||'',humidity:data.main.humidity,wind:data.wind?.speed,updatedAt:Date.now()};
}
export function WeatherProvider({user,children}){
 const {location}=useLocation();
 const [city,setCity]=useState(()=>{try{return localStorage.getItem(KEY)||'';}catch{return '';}});
 const [weather,setWeather]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const latitude=location?.latitude,longitude=location?.longitude;
 useEffect(()=>{
  if(!user){setWeather(null);setLoading(false);return;}
  if(!city&&!Number.isFinite(latitude))return;
  const controller=new AbortController();let active=true;setWeather(null);
  const load=async()=>{
   setLoading(true);setError('');
   try{
    const params=new URLSearchParams(city?{q:city}:{lat:String(latitude),lon:String(longitude)});
    const response=await fetch(`${API_URL}/api/weather?${params}`,{signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'Weather is unavailable. Please try again.');
    const result=normalizeWeather(data);if(active)setWeather(result);
   }catch(err){if(active&&err.name!=='AbortError')setError(err.message||'Could not load weather.');}
   finally{if(active)setLoading(false);}
  };
  load();const timer=setInterval(load,30*60*1000);
  return()=>{active=false;controller.abort();clearInterval(timer);};
 },[user?.uid,city,latitude,longitude,revision]);
 const chooseCity=value=>{const next=value.trim();if(!next)return;try{localStorage.setItem(KEY,next);}catch{}setCity(next);setRevision(n=>n+1);};
 return <WeatherContext.Provider value={{city,weather,loading,error,chooseCity,refresh:()=>setRevision(n=>n+1),hasLocation:Number.isFinite(latitude)}}>{children}</WeatherContext.Provider>;
}
export const useWeather=()=>useContext(WeatherContext);
