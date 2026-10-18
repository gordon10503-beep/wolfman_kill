import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themeForPhase, englishSeatText, chineseDeathText} from '../frontend/presentation.mjs';

test('private night actions use the night palette',()=>{
  for(const phase of ['wolves','witch','seer']) assert.equal(themeForPhase(phase),'night');
});
test('dawn, hunter resolution, voting and recap all use daylight',()=>{
  for(const phase of ['dawn','hunter','last_words','discussion','vote','runoff','finished']) assert.equal(themeForPhase(phase),'day');
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

test('a publicly revealed hunter keeps bilingual identity without exposing their death cause',async()=>{
  const {chineseSeatText}=await import('../frontend/presentation.mjs');
  const p={seat:5,alive:false,revealed_role:'hunter'};
  assert.equal(chineseSeatText(p,false),'獵人 · 已出局');
  assert.equal(englishSeatText(p,false),'Hunter · Eliminated');
  assert.equal(chineseSeatText({seat:6,alive:true},false),'身份未公開');
});

test('recap deaths identify each shooter without exposing that information during play',()=>{
  const victim={seat:1,role:'hunter',alive:false,cause:'hunter',hunter_seat:9};
  assert.equal(chineseDeathText(victim),'被獵人 9 號帶走');
  assert.equal(englishSeatText(victim,true),'Hunter · Shot by hunter 9');
  assert.equal(englishSeatText(victim,false),'Eliminated · Role hidden');
  assert.equal(chineseDeathText({...victim,seat:9,hunter_seat:12}),'被獵人 12 號帶走');
  assert.equal(englishSeatText({...victim,seat:9,hunter_seat:12},true),'Hunter · Shot by hunter 12');
  assert.equal(chineseDeathText({...victim,cause:'wolf'}),'夜晚出局');
  assert.equal(englishSeatText({...victim,cause:'wolf'},true),'Hunter · Killed at night');
});

test('older recaps recover each hunter from the chronicle and safely handle missing history',()=>{
  const victim={seat:1,role:'hunter',alive:false,cause:'hunter'};
  const events=[{text:'獵人 12 號開槍，9 號出局。'},{text:'獵人 9 號開槍，1 號出局。'},{text:'獵人 1 號放棄開槍。'}];
  assert.equal(chineseDeathText(victim,events),'被獵人 9 號帶走');
  assert.equal(englishSeatText(victim,true,events),'Hunter · Shot by hunter 9');
  assert.equal(englishSeatText({...victim,seat:9},true,events),'Hunter · Shot by hunter 12');
  assert.equal(chineseDeathText(victim),'被獵人帶走');
  assert.equal(englishSeatText(victim,true),'Hunter · Shot by the hunter');
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

test('each last-words speaker gets narration without replaying unchanged polls',async()=>{
  const {narrationChanged}=await import('../frontend/presentation.mjs');
  const first={phase:'last_words',day:1,last_words_seat:2};
  assert.equal(narrationChanged({phase:'dawn',day:1},first),true);
  assert.equal(narrationChanged(first,{...first,last_words_seat:6}),true);
  assert.equal(narrationChanged(first,{...first}),false);
});
