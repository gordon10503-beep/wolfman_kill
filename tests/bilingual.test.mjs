import test from 'node:test';
import assert from 'node:assert/strict';
import {englishFor} from '../frontend/bilingual.mjs';

test('house rules and setup instructions have English translations',()=>{
  for(const text of ['今晚的約定','允許狼人空刀','語音語言','女巫每晚用藥','最多一瓶','無限制','女巫可以自救','女巫被刀當晚可行動','狼人達到平票人數即勝','討論時間（秒）','身份由系統隨機分配，每人私下查看自己的身份。','一部裝置，主持全場。另設安全的觀眾畫面。']) {
    assert.ok(englishFor(text),text);
    assert.doesNotMatch(englishFor(text),/[\u3400-\u9fff]/u);
  }
});
test('private prompts and debug details retain seat numbers and meaning',()=>{
  assert.equal(englishFor('確認只有3 號玩家在看畫面。'),'Confirm that only player 3 is viewing the screen.');
  assert.equal(englishFor('你的狼人同伴：2、4 號。可以空刀，亦可選狼人。'),'Fellow wolves: seats 2, 4. You may skip the kill or choose a werewolf.');
  assert.equal(englishFor('本晚狼刀：3 · 毒藥目標：無 · 查驗：4 號（狼人）'),'Wolf target: seat 3 · Poison target: none · Investigation: seat 4 (Werewolf)');
  assert.equal(englishFor('↻ 重播公開旁白'),'Replay public narration');
  assert.equal(englishFor('被獵人 9 號帶走'),'Shot by hunter 9');
});
test('daytime logs, ballots, timers and errors translate',()=>{
  assert.equal(englishFor('昨晚 1 號、3 號 出局。'),'Eliminated last night: seats 1, 3.');
  assert.equal(englishFor('公投結果：4 號出局。'),'Vote result: seat 4 is eliminated.');
  assert.equal(englishFor('6 號玩家投給'),'Seat 6 votes for');
  assert.equal(englishFor('暫停計時'),'Pause timer');
  assert.ok(englishFor('每晚只可使用一瓶藥。請取消解藥或毒藥目標。'));
  assert.equal(englishFor('unknown custom text'),null);
  assert.equal(englishFor('6 號遺言結束。'),'Seat 6 has finished their last words.');
  for(const text of ['啟用遺言','最後的話','遺言結束，繼續 →','逐票記錄（可選） ↗'])assert.ok(englishFor(text),text);
});
