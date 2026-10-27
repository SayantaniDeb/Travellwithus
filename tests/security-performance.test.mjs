import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl } from '../src/utils/safeUrl.js';
import { mapConcurrent } from '../src/utils/mapConcurrent.js';

test('external URLs reject executable schemes, credentials and control characters', () => {
 for (const value of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com','https://example.com\n.evil.test','file:///tmp/test','']) assert.equal(safeExternalUrl(value),'');
 assert.equal(safeExternalUrl('example.com/travel'),'https://example.com/travel');
 assert.equal(safeExternalUrl('https://example.com/?q=goa'),'https://example.com/?q=goa');
});

test('bounded work preserves order and never exceeds the concurrency limit', async () => {
 let active=0, maximum=0;
 const results=await mapConcurrent([4,3,2,1],2,async value=>{
  active++;maximum=Math.max(maximum,active);
  await new Promise(resolve=>setTimeout(resolve,value*2));
  active--;return value*10;
 });
 assert.deepEqual(results,[40,30,20,10]); assert.equal(maximum,2); assert.equal(active,0);
 assert.deepEqual(await mapConcurrent([],2,()=>assert.fail()),[]);
 await assert.rejects(mapConcurrent([1],0,()=>1),RangeError);
});

import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('service worker bypasses private APIs and uses network-first navigation', async () => {
 const handlers={};let responses=0,fetches=0;
 const context={URL,Response,console,location:{origin:'https://travel.example'},self:{addEventListener:(name,fn)=>handlers[name]=fn},fetch:async()=>{fetches++;return new Response('fresh');},caches:{match:async()=>undefined,open:async()=>({put:()=>{},match:async()=>undefined})}};
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);
 handlers.fetch({request:{url:'https://travel.example/api/weather?q=Paris',method:'GET'},respondWith:()=>responses++});
 assert.equal(responses,0);
 let response;
 handlers.fetch({request:{url:'https://travel.example/',method:'GET',mode:'navigate'},respondWith:promise=>{response=promise;responses++;}});
 assert.equal(await (await response).text(),'fresh'); assert.equal(fetches,1);
 context.fetch=async()=>{throw Error('offline');};
 const offline=await vm.runInContext("cacheFirst({url:'https://travel.example/assets/missing.js'})",context);
 assert.equal(offline.status,503);
});
