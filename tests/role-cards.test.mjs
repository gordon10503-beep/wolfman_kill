import test from 'node:test';
import assert from 'node:assert/strict';
import {roleCard,characterArt} from '../frontend/role-cards.mjs';
import {readFileSync} from 'node:fs';
test('each identity has distinct detailed artwork, bilingual identity and faction styling',()=>{
  for(const role of ['wolf','wolf_king','white_wolf_king','wolf_beauty','hidden_wolf','seer','guard','witch','hunter','knight','gravedigger','idiot','villager']){
    const card=roleCard(role,4);
    assert.match(card,new RegExp(`data-character-role="${role}"`));
    assert.match(card,/SEAT 04/);
    assert.match(card,/class="english-subtext" lang="en"/);
    assert.match(card,new RegExp(['wolf','wolf_king','white_wolf_king','wolf_beauty','hidden_wolf'].includes(role)?'identity-bad':'identity-good'));
  }
  assert.equal(roleCard('<script>',1),'');
});

test('public archive cards have no game seat assignment',async()=>{
  const {characterRoles}=await import('../frontend/role-cards.mjs');
  for(const role of characterRoles){
    assert.match(roleCard(role,null),/THE ARCHIVE/);
    assert.doesNotMatch(roleCard(role,null),/SEAT/);
  }
});

test('character and halo are separate layers for the staged reveal',()=>{
  const card=roleCard('witch',2);
  assert.match(card,/class="identity-figure"/);
  assert.match(card,/class="identity-aura"/);
  assert.match(card,/#character-aura/);
});
test('shared sprite has unique IDs and supplies every card layer',()=>{
  const source=readFileSync(new URL('../frontend/assets/character-cards.svg',import.meta.url),'utf8');
  const ids=[...source.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const role of ['wolf','wolf_king','white_wolf_king','wolf_beauty','hidden_wolf','seer','guard','witch','hunter','knight','gravedigger','idiot','villager']){
    assert.ok(ids.includes(`character-${role}`));
    for(const ref of roleCard(role,1).matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(ref[1]),ref[1]);
  }
});

test('ground geometry is excluded from the rotating halo and shared by both views',()=>{
  const source=readFileSync(new URL('../frontend/assets/character-cards.svg',import.meta.url),'utf8');
  const halo=source.match(/<g id="character-halo"[\s\S]*?<\/g>/)[0];
  assert.doesNotMatch(halo,/M42 230/);
  assert.match(source,/<symbol id="character-ground"[\s\S]*?M42 230/);
  for(const kind of ['cast','identity']){
    const art=characterArt('wolf',kind);
    assert.match(art,new RegExp(`class="${kind}-aura"`));
    assert.match(art,/class="character-ground"/);
    assert.match(art,new RegExp(`class="${kind}-figure"`));
  }
});
test('role sprite supplies independently moving eyes, arrow and potion groups',()=>{
  const source=readFileSync(new URL('../frontend/assets/character-cards.svg',import.meta.url),'utf8');
  for(const part of ['wolf-eyes','seer-eye','hunter-arrow','potion-left','potion-right','guard-shield','knight-blade','grave-wisps','idiot-mask','wolf-crown','white-embers','beauty-heart','hidden-veil'])assert.match(source,new RegExp(`data-character-part="${part}"`));
  assert.match(source,/#ff465d/);
});


test('archive chapters divide the public catalogue into all, bad and good roles',async()=>{
  const {archiveRoles}=await import('../frontend/archive.mjs');
  assert.equal(archiveRoles('all').length,13);assert.equal(archiveRoles('bad').length,5);assert.equal(archiveRoles('good').length,8);
  assert.deepEqual(new Set([...archiveRoles('bad'),...archiveRoles('good')]),new Set(archiveRoles('all')));
  for(const role of archiveRoles('bad'))assert.match(roleCard(role,null),/identity-bad/);
  for(const role of archiveRoles('good'))assert.match(roleCard(role,null),/identity-good/);
});
