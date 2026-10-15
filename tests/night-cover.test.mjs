import test from 'node:test';
import assert from 'node:assert/strict';
import {NightCoverTimer} from '../frontend/night-cover.mjs';
import {roleTip} from '../frontend/role-effects.mjs';

function setup(t, read=async()=>({active:false})) {
  t.mock.timers.enable({apis:['setTimeout','Date'],now:0});
  const turn={key:'game:1:witch:0',phase:'witch',version:0,viewer:false,busy:false,hidden:false};
  const calls={read:0,pass:0};
  const timer=new NightCoverTimer({context:()=>turn,readPrivate:async()=>{calls.read++;return read();},pass:async()=>{calls.pass++;}});
  return {turn,calls,timer};
}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};

test('inactive turns wait ten seconds and never identify the role publicly',async t=>{
  const {timer,calls}=setup(t);timer.enter();
  t.mock.timers.tick(9999);await flush();assert.equal(calls.read,0);
  t.mock.timers.tick(1);await flush();assert.deepEqual(calls,{read:1,pass:1});
});
test('the timer cannot auto-pass an active witch or seer',async t=>{
  const {timer,calls,turn}=setup(t,async()=>({active:true}));
  timer.enter();t.mock.timers.tick(10000);await flush();assert.equal(calls.pass,0);
  turn.key='game:1:seer:1';turn.phase='seer';turn.version=1;
  timer.enter();t.mock.timers.tick(10000);await flush();assert.equal(calls.read,2);assert.equal(calls.pass,0);
});
test('audience and hunter turns never request private timeout data',async t=>{
  const {timer,calls,turn}=setup(t);turn.viewer=true;timer.enter();t.mock.timers.tick(10000);await flush();
  turn.viewer=false;turn.phase='hunter';turn.key='hunter';timer.enter();t.mock.timers.tick(10000);await flush();
  assert.deepEqual(calls,{read:0,pass:0});
});
test('stale private responses cannot skip the next actor in fun mode',async t=>{
  let resolve;const pending=new Promise(r=>resolve=r);
  const {timer,calls,turn}=setup(t,()=>pending);
  timer.enter();t.mock.timers.tick(10000);await flush();
  turn.key='game:1:witch:1';turn.version=1;timer.enter();resolve({active:false});await flush();
  assert.equal(calls.pass,0);
  t.mock.timers.tick(10000);await flush();assert.equal(calls.pass,1);
});
test('a hidden or busy page does not skip a role during another action',async t=>{
  const {timer,calls,turn}=setup(t);turn.hidden=true;timer.enter();t.mock.timers.tick(10000);await flush();assert.equal(calls.read,0);
  turn.hidden=false;turn.busy=true;await timer.check();assert.equal(calls.read,0);
  turn.busy=false;t.mock.timers.tick(500);await flush();assert.equal(calls.pass,1);
});
test('reveal tips remind eliminated players to keep clicking, in both languages',()=>{
  for(const role of ['wolf','witch','seer','hunter']) {
    const tip=roleTip(role);assert.match(tip,/即使已出局/);assert.match(tip,/Even after elimination/);assert.match(tip,/10 秒/);
  }
  assert.equal(roleTip('villager'),'');
});

test('private interaction renews the ten-second cover interval',async t=>{
  const {timer,calls}=setup(t);timer.enter();
  t.mock.timers.tick(9000);timer.touch();
  t.mock.timers.tick(1000);await flush();assert.equal(calls.read,0);
  t.mock.timers.tick(9000);await flush();assert.equal(calls.pass,1);
});
