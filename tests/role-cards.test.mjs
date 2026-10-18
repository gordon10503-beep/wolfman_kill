import test from 'node:test';
import assert from 'node:assert/strict';
import {roleCard} from '../frontend/role-cards.mjs';
import {readFileSync} from 'node:fs';
test('each identity has distinct detailed artwork, bilingual identity and faction styling',()=>{
  for(const role of ['wolf','seer','witch','hunter','villager']){
    const card=roleCard(role,4);
    assert.match(card,new RegExp(`#character-${role}`));
    assert.match(card,/SEAT 04/);
    assert.match(card,/class="english-subtext" lang="en"/);
    assert.match(card,new RegExp(role==='wolf'?'identity-bad':'identity-good'));
  }
  assert.equal(roleCard('<script>',1),'');
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
  for(const role of ['wolf','seer','witch','hunter','villager']){
    for(const ref of roleCard(role,1).matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(ref[1]),ref[1]);
  }
});
