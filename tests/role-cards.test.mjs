import test from 'node:test';
import assert from 'node:assert/strict';
import {roleCard} from '../frontend/role-cards.mjs';
test('each identity has distinct detailed artwork, bilingual identity and faction styling',()=>{
  for(const role of ['wolf','seer','witch','hunter','villager']){
    const card=roleCard(role,4);
    assert.match(card,new RegExp(`character-cards.svg#${role}`));
    assert.match(card,/SEAT 04/);
    assert.match(card,/class="english-subtext" lang="en"/);
    assert.match(card,new RegExp(role==='wolf'?'identity-bad':'identity-good'));
  }
  assert.equal(roleCard('<script>',1),'');
});
