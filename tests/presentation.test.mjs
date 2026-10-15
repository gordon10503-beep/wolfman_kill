import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themeForPhase} from '../frontend/presentation.mjs';

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
