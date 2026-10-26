import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Pause, Play } from 'lucide-react';
function Wheel({ x, y, frame, radius = 11 }) {
  return <g transform={`translate(${x} ${y})`}><circle r={radius} fill="#233247"/><circle r={radius*0.48} fill="#dce6ef"/><g style={{transform:`rotate(${frame*5}deg)`}} stroke="#8ca4b9" strokeWidth="2"><path d={`M${-radius*0.5} 0H${radius*0.5}M0 ${-radius*0.5}V${radius*0.5}`}/></g></g>;
}
function Cloud({x,y,scale=1}) {return <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.8"><ellipse rx="50" ry="14" cy="13"/><circle cx="-20" r="22"/><circle cx="12" cy="-9" r="29"/><circle cx="38" cy="6" r="20"/></g>;}
export function TravelBackdrop() {
  const frame=useCurrentFrame(),t=frame/720;
  const {width,height}=useVideoConfig();
  const scale=width<640?0.7:0.85;
  const busX=-170+((t+0.58)%1)*(width+340);
  const trainX=width+80-((t+0.68)%1)*(width+440);
  const bikeX=-90+((t*1.6+0.24)%1)*(width+180);
  const planeX=-110+((t*0.8+0.72)%1)*(width+220);
  const bob=Math.sin(frame/9)*0.8;
  return <AbsoluteFill><svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none"><defs><linearGradient id="travel-sky" x2="0" y2="1"><stop stopColor="var(--hero-sky-top, #bdeaff)"/><stop offset="1" stopColor="var(--hero-sky-bottom, #fff1d7)"/></linearGradient><linearGradient id="travel-hills" x2="0" y2="1"><stop stopColor="#80cdb1"/><stop offset="1" stopColor="#b4dec0"/></linearGradient><radialGradient id="travel-clear"><stop stopColor="var(--hero-clear, #f9fcff)" stopOpacity="0.98"/><stop offset="0.67" stopColor="var(--hero-clear, #f9fcff)" stopOpacity="0.88"/><stop offset="1" stopColor="var(--hero-clear, #f9fcff)" stopOpacity="0"/></radialGradient></defs><rect width={width} height={height} fill="url(#travel-sky)"/><g className="hero-day-sun"><circle cx={width*0.87} cy="83" r="37" fill="#ffc766"/><circle cx={width*0.87} cy="83" r="53" fill="#ffd98f" opacity="0.25"/></g><g className="hero-night-moon" transform={`translate(${width*0.87} 83)`}><circle r="50" fill="#c4d8ff" opacity="0.1"/><path d="M18-33A37 37 0 1 0 34 15 29 29 0 0 1 18-33Z" fill="#e3edff"/><path d="M-65-35v8m-4-4h8M57 28v10m-5-5h10" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round"/></g><Cloud x={width*0.09+t*20} y={82}/><Cloud x={width*0.35-t*15} y={50} scale={0.7}/><Cloud x={width*0.76+t*15} y={140} scale={0.65}/><svg x="0" y={height-300} width={width} height="300" viewBox="0 190 1440 410" preserveAspectRatio="none"><path d="M0 355 135 200 245 335 390 235 570 400 765 265 920 370 1110 222 1250 345 1440 250V600H0Z" fill="#b3b6de" opacity="0.65"/><path d="M0 400Q220 290 470 410T900 390T1440 340V600H0Z" fill="url(#travel-hills)"/><path d="M0 450Q250 360 530 455T1010 430T1440 395V600H0Z" fill="#6cbca5"/>
</svg>
    {/* A railway layer behind the road. */}
    <path d={`M0 ${height-155}H${width}`} stroke="#5c7483" strokeWidth="10"/>{Array.from({length:Math.ceil(width/25)},(_,i)=><path key={i} d={`M${i*25} ${height-161}v17`} stroke="#8b6d5b" strokeWidth="4"/>)}<g style={{transform:`translate(${trainX}px, ${height-155-56*scale}px) scale(${scale})`}}>{[0,1,2].map(i=><g key={i} transform={`translate(${i*140} 0)`}><rect x="0" y="0" width="132" height="47" rx="9" fill={i===0?'#8464d8':'#9577e1'}/><rect x="0" y="32" width="132" height="7" fill="#ebd7ff"/>{[0,1,2,3].map(j=><rect key={j} x={12+j*28} y="9" width="19" height="15" rx="3" fill="#dff4ff"/>)}<Wheel x={24} y={48} frame={-frame} radius={8}/><Wheel x={106} y={48} frame={-frame} radius={8}/></g>)}</g>
    <path d={`M0 ${height-138}H${width}V${height}H0Z`} fill="#78b49a"/><path d={`M0 ${height-112}H${width}V${height-24}H0Z`} fill="#46556b"/><path d={`M0 ${height-109}H${width}M0 ${height-27}H${width}`} stroke="#dce6eb" strokeWidth="3"/><path d={`M0 ${height-67}H${width}`} stroke="#f8e3a1" strokeWidth="3" strokeDasharray="27 22"/>
    {/* Warm yellow coach moving in the foreground. */}
    <g style={{transform:`translate(${busX}px, ${height-145+bob}px) scale(${scale})`}}><ellipse cx="75" cy="77" rx="90" ry="8" fill="#183f48" opacity="0.16"/><rect width="166" height="65" rx="13" fill="#ffbd4a"/><path d="M144 5Q163 8 166 25V43H137V8Z" fill="#bfe8f5"/>{[0,1,2,3].map(i=><rect key={i} x={12+i*30} y="10" width="24" height="23" rx="4" fill="#bfe8f5"/>)}<path d="M4 44H163" stroke="#e88b3a" strokeWidth="7"/><rect x="144" y="47" width="16" height="7" rx="2" fill="#fff3b9"/><Wheel x={34} y={64} frame={frame}/><Wheel x={132} y={64} frame={frame}/></g>
    {/* A small motorcycle and rider in the near lane. */}
    <g style={{transform:`translate(${bikeX}px, ${height-73+Math.sin(frame/7)*0.5}px) scale(${scale})`}}><ellipse cx="35" cy="32" rx="58" ry="5" fill="#183f48" opacity="0.17"/><Wheel x={0} y={20} frame={frame} radius={13}/><Wheel x={71} y={20} frame={frame} radius={13}/><path d="M0 20 25 0 48 20H0M48 20 60 -10 71 20M59 -10H75" fill="none" stroke="#ee725d" strokeWidth="6" strokeLinecap="round"/><path d="M23 -4H49" stroke="#243447" strokeWidth="7" strokeLinecap="round"/><path d="M29 -37 41 -14 60 -11M31 -18 22 0 43 14" fill="none" stroke="#274d73" strokeWidth="8" strokeLinecap="round"/><circle cx="28" cy="-48" r="11" fill="#ffcf70"/><path d="M18 -49Q28 -64 39 -48H18Z" fill="#f27167"/></g>
    {/* Airplane passing across the upper sky. */}
    <g style={{transform:`translate(${planeX}px, ${80+Math.sin(frame/110)*14}px) rotate(-5deg)`}}><path d="M-150 5H-42" stroke="#ffffff" strokeWidth="3" strokeDasharray="12 10" opacity="0.65"/><path d="M-42 0-12 -7-30 -33-17 -33 14 -10 48 -7Q66 0 48 7L14 10-17 33-30 33-12 7-42 0Z" fill="#f8fcff" stroke="#6b9fcb" strokeWidth="2"/><path d="M-42 0-57 -15H-48L-24 -5" fill="#438cc8"/><path d="M30 -4H44" stroke="#75a9c9" strokeWidth="3"/></g>
    {/* Quiet centre for the headline and destination form. */}
    <ellipse cx={width/2} cy={(height-220)/2} rx={width*0.46} ry={(height-220)*0.52} fill="url(#travel-clear)"/>
  </svg></AbsoluteFill>;
}
export default function TravelHeroBackground() {
  const player=useRef(null),container=useRef(null);
  const [size,setSize]=useState({width:1440,height:700});
  useLayoutEffect(()=>{
    if(!container.current)return;
    const bounds=container.current.getBoundingClientRect();
    if(bounds.width>0&&bounds.height>0)setSize({width:Math.round(bounds.width),height:Math.round(bounds.height)});
    const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width>0 && height>0)setSize({width:Math.round(width),height:Math.round(height)});});
    observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  const [paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>{if(media.matches)setPaused(true);};media.addEventListener('change',change);
    const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting && !paused && !document.hidden)player.current?.play();else player.current?.pause();});
    if(container.current)observer.observe(container.current);
    const visibility=()=>{if(document.hidden || paused)player.current?.pause();else if(container.current?.getBoundingClientRect().bottom>0)player.current?.play();};
    document.addEventListener('visibilitychange',visibility);
    if(paused)player.current?.pause();
    return()=>{observer.disconnect();media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
  },[paused]);
  return <><div ref={container} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><Player ref={player} component={TravelBackdrop} durationInFrames={720} fps={30} compositionWidth={size.width} compositionHeight={size.height} loop autoPlay={!paused} controls={false} clickToPlay={false} style={{width:'100%',height:'100%'}} /></div><button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Play background animation':'Pause background animation'} title={paused?'Play animation':'Pause animation'} className="absolute top-3 right-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-500">{paused?<Play size={12}/>:<Pause size={12}/>}<span className="hidden sm:inline">{paused?'Play motion':'Pause motion'}</span></button></>;
}
