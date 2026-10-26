// Coalesce viewport events into one style update per animation frame.
// Leave zoom and document scrolling under browser control for accessibility.
let initialized=false;
export const initMobileOptimizations=()=>{
 if(initialized)return;
 initialized=true;
 let frame=0,lastHeight=0;
 const update=()=>{
  frame=0;
  const height=window.visualViewport?.height||window.innerHeight;
  if(height===lastHeight)return;
  lastHeight=height;
  document.documentElement.style.setProperty('--vh',`${height*.01}px`);
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 update();
};
