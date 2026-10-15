import test from 'node:test';
import assert from 'node:assert/strict';
import {roleEffect} from '../frontend/role-effects.mjs';

function stubGlobal(t,name,value) {
  const original=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
  t.after(()=>{if(original)Object.defineProperty(globalThis,name,original);else delete globalThis[name];});
}

function scene(t) {
  const events=[];
  function animation(name) {
    let finish,abort;
    const finished=new Promise((resolve,reject)=>{finish=resolve;abort=reject;});
    return {finished,finish,abort,cancel(){events.push(`${name}:cancel`);}};
  }
  const flight=animation('flight'),flip=animation('flip');
  const icon={setAttribute(){},animate(frames,options){this.frames=frames;this.options=options;return flight;},remove(){this.removed=true;events.push('remove');}};
  const card={getBoundingClientRect:()=>({x:300,y:200,width:80,height:80}),animate:()=>flip};
  const dialog={open:true,append:node=>{assert.equal(node,icon);}};
  const button={getBoundingClientRect:()=>({x:100,y:400,width:100,height:40})};
  const form={isConnected:true,closest:()=>dialog,querySelector:selector=>selector==='button'?button:{nextElementSibling:card}};
  stubGlobal(t,'document',{hidden:false,createElement:()=>icon});
  stubGlobal(t,'sessionStorage',{getItem:()=>null});
  return {form,icon,dialog,flight,flip,events};
}

test('the projectile holds its destination while the longer card flip completes',async t=>{
  const {form,icon,flight,flip,events}=scene(t);
  let completed=false;
  const result=roleEffect(form,'seer',2).then(value=>{completed=true;return value;});
  assert.equal(icon.options.fill,'both');
  assert.match(icon.frames.at(-1).transform,/translate\(318px,218px\)/);
  flight.finish();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(completed,false);
  assert.equal(icon.removed,undefined);
  flip.finish();
  assert.equal(await result,true);
  assert.deepEqual(events,['remove','flight:cancel','flip:cancel']);
});

test('closing a private effect removes its icon before releasing animation styles',async t=>{
  const {form,dialog,flight,events}=scene(t);
  const result=roleEffect(form,'witch',2);
  dialog.open=false;
  flight.abort(new Error('Animation cancelled'));
  assert.equal(await result,false);
  assert.deepEqual(events,['remove','flight:cancel','flip:cancel']);
});
