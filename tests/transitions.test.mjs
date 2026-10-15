import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldSweep, wolfSweep} from '../frontend/transitions.mjs';

test('wolf sweeps only at a new game and after all role handoffs',()=>{
  assert.equal(shouldSweep(undefined,'reveal',true),true);
  assert.equal(shouldSweep(undefined,'reveal'),false);
  assert.equal(shouldSweep('reveal','reveal'),false);
  assert.equal(shouldSweep('reveal','wolves'),true);
  assert.equal(shouldSweep('seer','dawn'),false);
  assert.equal(shouldSweep('vote','wolves'),false);
});

test('paused motion swaps immediately without creating an overlay',async t=>{
  stubGlobal(t,'document',{hidden:false});
  stubGlobal(t,'sessionStorage',{getItem:()=> 'off'});
  let renders=0;
  await wolfSweep(()=>renders++);
  assert.equal(renders,1);
});

function stubGlobal(t,name,value) {
  const original=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
  t.after(()=>{if(original)Object.defineProperty(globalThis,name,original);else delete globalThis[name];});
}

function fakePage(t) {
  const app={inert:false};
  const overlays=[];
  const page={hidden:false,querySelector:()=>app,createElement:()=>({setAttribute(){},append(){},remove(){this.removed=true;}}),body:{append:node=>overlays.push(node)}};
  stubGlobal(t,'document',page);
  stubGlobal(t,'sessionStorage',{getItem:()=>null});
  t.mock.timers.enable({apis:['setTimeout']});
  return {app,overlays};
}

test('screen changes under the curtain and controls unlock after the sweep',async t=>{
  const {app,overlays}=fakePage(t);
  let renders=0;
  const completion=wolfSweep(()=>renders++);
  assert.equal(app.inert,true);
  assert.equal(renders,0);
  t.mock.timers.tick(500);
  await Promise.resolve();
  assert.equal(renders,1);
  assert.equal(app.inert,true);
  t.mock.timers.tick(700);
  await completion;
  assert.equal(app.inert,false);
  assert.equal(overlays[0].removed,true);
});

test('a render failure cannot leave the page blocked by the transition',async t=>{
  const {app,overlays}=fakePage(t);
  const completion=wolfSweep(()=>{throw new Error('render failed');});
  const rejected=assert.rejects(completion,/render failed/);
  t.mock.timers.tick(500);
  await rejected;
  assert.equal(app.inert,false);
  assert.equal(overlays[0].removed,true);
});
