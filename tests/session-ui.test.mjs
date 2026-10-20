import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actionLabel,hasPlayerAction,voteRecords} from '../frontend/session-ui.mjs';

test('the action button follows the actual phase instead of a generic role/action label',()=>{
  assert.equal(actionLabel('vote'),'投票 · Vote');assert.equal(actionLabel('seer'),'查驗玩家 · Investigate a player');
  assert.equal(hasPlayerAction('discussion'),false);assert.equal(hasPlayerAction('runoff'),true);
});
test('the public vote ledger preserves abstentions, voters and runoff history safely',()=>{
  const html=voteRecords([{day:1,round:'runoff',ballots:{1:2,2:null},leaders:[2]}]);
  assert.match(html,/1 號 → 2 號/);assert.match(html,/2 號 → 棄權/);assert.match(html,/Runoff/);
  assert.equal(voteRecords(), '');
});
