import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actionLabel,hasPlayerAction,voteRecords,wolfVoteSummary} from '../frontend/session-ui.mjs';

test('wolf voting explains highest-vote selection and private runoff targets',()=>{
  assert.match(wolfVoteSummary({round:1}),/most votes wins/);
  const runoff=wolfVoteSummary({round:2,runoff:[3,5]});
  assert.match(runoff,/Runoff/);assert.match(runoff,/Tied targets: 3, 5/);
  assert.match(runoff,/second tie means no kill/);
});

test('the action button follows the actual phase instead of a generic role/action label',()=>{
  assert.equal(actionLabel('vote'),'投票 · Vote');assert.equal(actionLabel('seer'),'查驗玩家 · Investigate a player');
  assert.equal(hasPlayerAction('discussion'),true);assert.equal(hasPlayerAction('runoff'),true);
});
test('the public vote ledger preserves abstentions, voters and runoff history safely',()=>{
  const html=voteRecords([{day:1,round:'runoff',ballots:{1:2,2:null},leaders:[2]}]);
  assert.match(html,/1 號 → 2 號/);assert.match(html,/2 號 → 棄權/);assert.match(html,/Runoff/);
  assert.equal(voteRecords(), '');
});
