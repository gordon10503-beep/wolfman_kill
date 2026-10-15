import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themeForPhase, englishSeatText} from '../frontend/presentation.mjs';

test('private night actions use the night palette',()=>{
  for(const phase of ['wolves','witch','seer']) assert.equal(themeForPhase(phase),'night');
});
test('dawn, hunter resolution, voting and recap all use daylight',()=>{
  for(const phase of ['dawn','hunter','discussion','vote','runoff','finished']) assert.equal(themeForPhase(phase),'day');
});
test('dealing and home retain the original lobby atmosphere',()=>{
  assert.equal(themeForPhase('reveal'),'lobby');
  assert.equal(themeForPhase(undefined),'lobby');
});

test('seat subtext explains the recap without leaking identities or death causes during play',()=>{
  const poisonedWolf={role:'wolf',alive:false,cause:'poison'};
  assert.equal(englishSeatText(poisonedWolf,false),'Eliminated · Role hidden');
  assert.equal(englishSeatText({role:'seer',alive:true},false),'Alive · Role hidden');
  assert.equal(englishSeatText(poisonedWolf,true),'Werewolf · Poisoned');
  assert.equal(englishSeatText({role:'hunter',alive:true},true),'Hunter · Alive');
  assert.equal(englishSeatText({role:'villager',alive:false,cause:'vote'},true),'Villager · Voted out');
  assert.equal(englishSeatText({role:'witch',alive:false,cause:'hunter'},true),'Witch · Shot by the hunter');
});

test('each hunter in a chain receives narration, while repeated state polls stay silent',async()=>{
  const {narrationChanged}=await import('../frontend/presentation.mjs');
  const first={phase:'hunter',day:1,hunter:7};
  assert.equal(narrationChanged({phase:'dawn',day:1,hunter:null},first),true);
  assert.equal(narrationChanged(first,{...first,hunter:11}),true);
  assert.equal(narrationChanged({...first,hunter:11},{...first,hunter:9}),true);
  assert.equal(narrationChanged(first,{...first}),false);
});
test('fun mode caps each non-wolf role at 15 and wolves at 7',async()=>{
  const {roleLimit}=await import('../frontend/presentation.mjs');
  for(const role of ['seer','witch','hunter','villager'])assert.equal(roleLimit(role,true),15);
  assert.equal(roleLimit('wolf',true),7);
  assert.equal(roleLimit('seer',false),1);
});
