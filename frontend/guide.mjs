import {refreshInstallButton} from './install.mjs';
let normalGuide;
const steps=[
 ['先選一個 6 人局','Start with the 6-player preset','開啟 DEBUG，選好房規，再按「開始遊戲」。不需要邀請朋友，也不需要額外分頁。','Enable DEBUG, set the house rules, then press Begin the night. No friends or extra tabs are needed.'],
 ['略過身份交接','Skip the role handoff','上方身份表顯示全部角色。按「略過身份交接 · Skip handoff」代替未入座玩家準備；已批准的真人仍要自己按 Ready。','The DEBUG roster shows every role. Skip handoff marks simulated seats ready; approved real players must still press Ready themselves.'],
 ['逐個測試夜間能力','Try each night action','按目前角色的「私人行動」，再按「我已準備好 · 揭開」。狼人選座位或空刀並確認；女巫可救人、下毒或放棄；預言家先查驗，再確認結果；之後守衛選擇守護，守墓人查看上日放逐陣營。','Open the current private action, then reveal it. Wolves select a seat or pass; witches save, poison or pass; seers investigate and confirm, then guardians protect and gravediggers read the previous day’s exile.'],
 ['公布天亮結果','Publish the morning result','按「公布昨晚結果」。如有獵人，選擇目標或放棄；如有遺言，按「遺言結束，繼續」。先處理完這些，才會結算勝負或討論。','Press Publish last night’s result. Resolve any hunter shots and last words before the game checks victory or starts discussion.'],
 ['略過討論、測試投票','Skip discussion and test voting','按「跳過討論（DEBUG）」。獨自測試時可直接選最高票座位並確認現場結果，或逐票記錄。有人加入時，只能模擬未入座玩家的票，真人要自己投票。','Press Skip discussion. Alone, select the counted result or record individual ballots. With joined players, simulate unclaimed seats only; real players cast their own votes.'],
 ['測試新角色','Test the new roles','白天按「騎士決鬥」選騎士及目標；已加入玩家只能自己操作。投票選白痴神會翻牌免死並失去投票權。守護與解藥同中依房規決定。','During discussion, test a knight duel with an unclaimed seat. Approved players control their own knight. Voting for an Idiot reveals and spares them, removing their vote. Protection plus antidote follows the house rule.'],
 ['完成一局，再換設定','Finish a game, then try new rules','循環夜晚與白天，直到好人、狼人勝利或平局。用「新遊戲」換房規。查看身份只顯示自己的卡；下方行動按鈕依階段顯示投票、查驗等。','Continue night and day until a team wins or the game draws. Use New game to change house rules. The identity button shows your card; the separate action button follows the current phase.'],
 ['與朋友一起除錯','Debug with friends','已批准玩家保留自己的角色。狼隊選擇必須一致。遠端模式每人有旁白、音量及文字聊天；同場模式由主裝置旁白。','Approved players keep their own roles. All living wolves must agree. Remote mode gives each player narration, volume and text chat; in-person mode uses the main narrator device.']
];
export function updateGuideLabels(debug){
  const help=document.querySelector('#help');help.setAttribute('aria-label',debug?'除錯指南 / DEBUG guide':'玩法指南 / How to play');help.title=debug?'除錯指南 / DEBUG guide':'玩法指南 / How to play';
  const home=document.querySelector('#learn-game');if(home)home.innerHTML=debug?'? 除錯指南 · DEBUG walkthrough':'? 玩法指南 · How to play';
}
export function showGuide(debug){
  const dialog=document.querySelector('#help-dialog');normalGuide??=dialog.innerHTML;
  dialog.setAttribute('aria-label',debug?'除錯指南 / DEBUG guide':'玩法指南 / How to play');
  dialog.innerHTML=debug?`<button class="close" aria-label="關閉指南 / Close guide">×</button><p class="eyebrow">YOUR FIRST DEBUG SESSION</p><h2>一個人也能試玩<span class="english-subtext">Solo DEBUG walkthrough</span></h2><p>這是主持人專用的測試模式，會顯示所有身份。<span class="english-subtext">This host-only testing mode reveals all identities.</span></p><ol class="debug-walkthrough">${steps.map(([zh,en,body,translation])=>`<li><h3>${zh}<span class="english-subtext">${en}</span></h3><p>${body}<span class="english-subtext">${translation}</span></p></li>`).join('')}</ol><button type="button" class="primary" data-close="help-dialog">明白了，返回遊戲 · Got it, back to the game</button>`:normalGuide;
  dialog.querySelectorAll('.close,[data-close="help-dialog"]').forEach(button=>button.onclick=()=>dialog.close());
  refreshInstallButton();dialog.showModal();
}
