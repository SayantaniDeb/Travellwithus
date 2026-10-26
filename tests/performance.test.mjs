import test from 'node:test';
import assert from 'node:assert/strict';
import { itineraryDayLabel } from '../src/utils/dayLabels.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('cached day numbering remains correct after a new immutable day list',()=>{
 const days=[{day:1,travelReservation:{journeyId:'onward'}},{day:2,date:'2026-10-27'},{day:3,date:'2026-10-28'},{day:4,travelReservation:{journeyId:'return'}}];
 assert.equal(itineraryDayLabel(days,days[1]),'Day 1');
 assert.equal(itineraryDayLabel(days,{...days[2]}),'Day 2');
 assert.equal(itineraryDayLabel(days,days[0]),'Onward travel');
 assert.equal(itineraryDayLabel(days,days[3]),'Return travel');
 const changed=[days[0],{day:5,date:'2026-10-26'},...days.slice(1)];
 assert.equal(itineraryDayLabel(changed,days[1]),'Day 2');
 assert.equal(itineraryDayLabel(days,days[1]),'Day 1');
});

test('viewport updates are idempotent and coalesced without blocking touch or zoom',()=>{
 const writes=[],pending=[],listeners={};
 const context={window:{innerHeight:800,addEventListener:(name,fn)=>listeners[name]=fn,visualViewport:{height:700,addEventListener:(name,fn)=>listeners[`visual-${name}`]=fn}},document:{documentElement:{style:{setProperty:(...args)=>writes.push(args)}}},requestAnimationFrame:fn=>{pending.push(fn);return 1;}};
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../src/utils/mobileOptimizations.js',import.meta.url),'utf8').replace('export const','const')+'\nthis.init=initMobileOptimizations;',context);
 context.init();context.init();assert.equal(writes.length,1);
 listeners.resize();listeners.resize();listeners['visual-resize']();assert.equal(pending.length,1);
 pending.shift()();assert.equal(writes.length,1);
 context.window.visualViewport.height=500;listeners.resize();pending.shift()();assert.equal(writes.length,2);assert.equal(writes[1][1],'5px');
 assert(!listeners.touchend);assert(!listeners.focus);
});
