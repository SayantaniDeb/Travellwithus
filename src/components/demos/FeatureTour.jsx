import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { Sequence, useCurrentFrame } from 'remotion';
import { MapPin, CalendarDays, MessageCircle, Wallet, CloudSun, ClipboardList, Hotel, Heart, ArrowRight, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../../Firebase';
import FeatureDemoVideo from './FeatureDemoVideo';
import { FEATURES, DEMO_FPS, DEMO_FRAMES, STEP_FRAMES, demoStage } from './features';
const ICONS=[MapPin,CalendarDays,MessageCircle,Wallet,CloudSun,ClipboardList,Hotel,Heart];
export const TOUR_FRAMES=FEATURES.length*DEMO_FRAMES;
export function tourPosition(frame) {
  const index=Math.min(FEATURES.length-1,Math.max(0,Math.floor(frame/DEMO_FRAMES)));
  return {index,step:demoStage(Math.max(0,frame-index*DEMO_FRAMES))};
}
export function FeatureTourVideo({ values, destination, onAction, onStep, onDestinationChange, edits, onEdit, paused, onTogglePlayback, onNext }) {
  return <>{FEATURES.map((feature,index)=><Sequence key={feature.id} from={index*DEMO_FRAMES} durationInFrames={DEMO_FRAMES}><FeatureDemoVideo feature={feature} value={values[feature.id]} state={edits?.[feature.id]||{}} onEdit={patch=>onEdit(feature.id,patch)} destination={destination} onAction={value=>onAction(feature.id,value)} onStep={step=>onStep(index,step)} onDestinationChange={onDestinationChange} paused={paused} onTogglePlayback={onTogglePlayback} onNext={onNext} seamless /></Sequence>)}</>;
}
export default function FeatureTour() {
  const [signedIn,setSignedIn]=useState(Boolean(auth?.currentUser && !auth.currentUser.isAnonymous));
  useEffect(()=>onAuthStateChanged(auth,user=>setSignedIn(!!user)),[]);
  const player=useRef(null),tabs=useRef([]),navigate=useNavigate();
  const [paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pausedRef=useRef(paused);
  useEffect(()=>{pausedRef.current=paused;if(paused)player.current?.pause();else player.current?.play();},[paused]);
  const [position,setPosition]=useState({index:0,step:0}),[values,setValues]=useState({}),[destination,setDestination]=useState('Darjeeling, India'),[edits,setEdits]=useState({});
  const feature=FEATURES[position.index];
  useEffect(()=>{
    const api=player.current;if(!api)return;
    const update=event=>{const next=tourPosition(event.detail.frame);setPosition(current=>current.index===next.index&&current.step===next.step?current:next);};
    api.addEventListener('frameupdate',update);
    const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)api.pause();else if(!pausedRef.current && !document.hidden)api.play();});
    const node=document.getElementById('feature-tour-player');if(node)observer.observe(node);
    const hide=()=>{if(document.hidden)api.pause();else if(!pausedRef.current && node?.getBoundingClientRect().bottom>0)api.play();};document.addEventListener('visibilitychange',hide);
    return()=>{api.removeEventListener('frameupdate',update);observer.disconnect();document.removeEventListener('visibilitychange',hide);};
  },[]);
  const jump=(index,step=0)=>{player.current?.seekTo(index*DEMO_FRAMES+step*STEP_FRAMES);setPosition({index,step});if(!pausedRef.current)player.current?.play();};
  const edit=(id,patch)=>{setPaused(true);player.current?.pause();setEdits(current=>({...current,[id]:{...current[id],...patch}}));};
  const act=(id,value)=>{setPaused(true);player.current?.pause();setValues(current=>({...current,[id]:typeof value==='number'?value:((current[id]||0)+1)%8}));};
  return <div className="feature-showcase mx-auto max-w-5xl">
    <div role="tablist" aria-label="Explore features" className="feature-tour-tabs mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">{FEATURES.map((item,index)=>{const TabIcon=ICONS[index];return <button key={item.id} ref={node=>tabs.current[index]=node} id={`tour-tab-${item.id}`} role="tab" aria-selected={position.index===index} aria-controls="feature-tour-panel" tabIndex={position.index===index?0:-1} onClick={()=>jump(index)} onKeyDown={event=>{let next;if(event.key==='ArrowRight')next=(index+1)%FEATURES.length;else if(event.key==='ArrowLeft')next=(index+FEATURES.length-1)%FEATURES.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=FEATURES.length-1;else return;event.preventDefault();tabs.current[next]?.focus();jump(next);}} className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition ${position.index===index?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-slate-500 hover:bg-white'}`}><TabIcon size={15} aria-hidden="true"/>{item.title}{!signedIn&&item.id!=='planner'&&<LockKeyhole size={12} aria-label="Sign-in required" className="ml-auto opacity-60"/>}</button>;})}</div>
    {!signedIn&&<p className="mb-2 text-center text-xs text-slate-500">AI Trip Planner is available without signing in. Sign in to use the other features; you can preview them below.</p>}
    <p className="mb-2 text-center text-xs text-slate-500">Watch it happen automatically. Tap any control to pause and take over.</p>
    <div id="feature-tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${feature.id}`}>
      <div id="feature-tour-player" className="feature-animation-stage feature-tour-responsive mx-auto"><Player ref={player} component={FeatureTourVideo} inputProps={{values,destination,paused,onTogglePlayback:()=>setPaused(value=>!value),onNext:()=>{const frame=player.current?.getCurrentFrame()??0;const nextFrame=(Math.floor(frame/STEP_FRAMES)+1)*STEP_FRAMES%TOUR_FRAMES;const next=tourPosition(nextFrame);jump(next.index,next.step);},onAction:(id,value)=>{if(id==='planner'&&value==='generate'){edit(id,{generated:true});jump(0,2);player.current?.pause();}else act(id,value);},edits,onEdit:edit,onStep:(index,step)=>{setPaused(true);player.current?.pause();jump(index,step);player.current?.pause();},onDestinationChange:value=>{setPaused(true);player.current?.pause();setDestination(value);}}} durationInFrames={TOUR_FRAMES} compositionWidth={800} compositionHeight={700} fps={DEMO_FPS} controls={false} loop autoPlay={!paused} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} style={{width:'100%'}} /></div>
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 pt-1"><button onClick={()=>{player.current?.pause();if(!signedIn&&feature.id!=='planner'){navigate('/login',{state:{from:feature.route}});return;}if(feature.route.startsWith('#')){document.querySelector(feature.route)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});document.querySelector(`${feature.route} input`)?.focus({preventScroll:true});}else navigate(feature.route);}} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{!signedIn&&feature.id!=='planner'?`Sign in to use ${feature.title}`:`Open ${feature.title}`}<ArrowRight size={16}/></button></div>
    </div>
  </div>;
}
