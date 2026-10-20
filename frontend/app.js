import {clearNarratorPanel,mountNarratorPanel,selectedPlayMode,updateRuleSummary} from './settings-ui.mjs';
import {NightCoverTimer} from './night-cover.mjs';
import {roleTip, roleEffect, privacyReminder} from './role-effects.mjs';
import {shouldSweep, wolfSweep, skyChange, skySweep} from './transitions.mjs';
import {bilingualize, setBilingualText} from './bilingual.mjs';
import {Narrator} from './audio.mjs';
import {themeForPhase, englishSeatText, chineseSeatText, chineseDeathText, narrationChanged, roleLimit} from './presentation.mjs';
import {RoomHost, startPlayer} from './rooms.mjs';
import {roleCard,characterArt,focusRoleCard} from './role-cards.mjs';
import {openArchive} from './archive.mjs';
import {RoomChat} from './chat.mjs';
import {actionLabel,hasPlayerAction,voiceVolume,bindVolume,voteRecords} from './session-ui.mjs';
import {showGuide,updateGuideLabels} from './guide.mjs';
const $ = (q, root = document) => root.querySelector(q);
const app = $('#app');
const privateDialog = $('#private-dialog');
$('#archive').onclick=openArchive;
const playerPage = new URLSearchParams(location.hash.slice(1)).has('join') || new URLSearchParams(location.hash.slice(1)).has('player');
const labels = {wolf:'狼人',seer:'預言家',witch:'女巫',hunter:'獵人',villager:'平民'};
const symbols = Object.fromEntries(Object.keys(labels).map(role=>[role,`<svg viewBox="0 0 48 48" aria-hidden="true"><use href="/assets/roles.svg#${role}"></use></svg>`]));
const names = {reveal:'身份交接',wolves:'狼人行動',witch:'女巫行動',seer:'預言家查驗',dawn:'等待天亮',hunter:'獵人的最後一槍',last_words:'最後的話',discussion:'白天討論',vote:'村莊公投',runoff:'平票加賽',finished:'月落，真相浮現'};
const descriptions = {reveal:'請將裝置交給指定座位。只有本人可以打開身份卡，確認後立即收起。',wolves:'所有人閉眼。只有狼人可以查看私人畫面，並共同選擇今晚的目標。',witch:'狼人閉眼，女巫睜眼。請女巫私下決定是否使用藥物。',seer:'女巫閉眼，預言家睜眼。查驗結果只會在私人畫面顯示。',dawn:'所有夜間行動已鎖定。確認大家睜眼後，公布昨晚的結果。',hunter:'勝負尚未結算。獵人可以帶走一位存活玩家，或放棄開槍。',last_words:'請指定座位發表遺言。說完後由主持人確認，再繼續遊戲。',discussion:'每個聲音都可能藏著線索。依座位發言，仔細聆聽，再作判斷。',vote:'依次記錄每位存活玩家的選擇。可以棄權，也可以投自己。',runoff:'只在平票玩家之間再投一次。若仍平票，今晚無人出局。',finished:'所有秘密已經揭曉。回看每個座位的身份，拼出這一夜的故事。'};
const presets = {6:{wolf:2,seer:1,witch:1,hunter:0,villager:2},9:{wolf:3,seer:1,witch:1,hunter:1,villager:3},12:{wolf:4,seer:1,witch:1,hunter:1,villager:5}};
let counts = {...presets[9]}, state = null, session = null, busy = false, voice = sessionStorage.getItem('moonfall-voice-enabled-host') !== 'false', pollBusy = false;
let timerInterval, toastTimeout;
let debugEnabled = sessionStorage.getItem('moonfall-debug') === 'true';
let debugRequest = 0;
let debugControl=null;
let hostPrivate=false,hostPlayerTurn=null;
const speakerId=crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
let mainSpeaker=true,speakerBusy=false;
async function claimSpeaker(next=state) {
  if(!session || session.viewer || playerPage || next?.room?.mode!=='multi'){mainSpeaker=true;return;}
  if(speakerBusy)return;speakerBusy=true;
  try{
    session.speaker=speakerId;
    const result=await api(`/api/games/${session.id}/speaker`,{method:'POST',body:JSON.stringify({device:speakerId})});
    mainSpeaker=result.main;
  }catch{mainSpeaker=false;}
  finally{speakerBusy=false;}
  if(!mainSpeaker){narrator.stop();const el=$('#voice-status');if(el)el.textContent='另一主裝置負責旁白 · Another main device is narrating';}
}
let speechLanguage = sessionStorage.getItem('moonfall-speech-language') === 'en' ? 'en' : 'yue';
function preferredVoice(language) {
  const saved = sessionStorage.getItem(`moonfall-voice-${language}`);
  return ['original','narrator'].includes(saved) ? saved : language==='en' ? 'narrator' : 'original';
}
let voiceProfile = preferredVoice(speechLanguage);
let allowFallback = sessionStorage.getItem('moonfall-voice-fallback') === 'true';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = {lobby:'#0b1113',day:'#edf3eb',night:'#0a1116'}[theme];
}
function updateDebugButton() {
  $('#debug').hidden = !!session?.viewer;
  $('#debug').textContent = debugEnabled ? '除錯開啟 · DEBUG on' : '除錯關閉 · DEBUG off';
  $('#debug').setAttribute('aria-pressed', String(debugEnabled));
  updateGuideLabels(debugEnabled);
}
async function loadDebug() {
  const request = ++debugRequest;
  const slot = $('#debug-panel');
  if (!debugEnabled || session?.viewer || !slot) return;
  slot.innerHTML = '<p class="muted">正在載入主持人身份表…</p>';
  bilingualize(slot);
  try {
    const info = await api(`/api/games/${session.id}/debug`);
    if (request !== debugRequest || !debugEnabled || session?.viewer || !$('#debug-panel')) return;
    if (info.version !== state.version) { await refresh(); return; }
    debugControl=info.control;
    applyDebugControl();
    slot.innerHTML = `<div class="debug-heading"><span class="eyebrow">DEBUG · 主持人專用</span><span class="muted">${escape(info.phase)} / v${info.version}</span></div><div class="debug-roster">${info.players.map(p=>`<div><strong>${p.seat} 號 · ${labels[p.role]}</strong><span>${p.alive?'存活':chineseDeathText(p,state.events)}</span></div>`).join('')}</div><p class="muted">${info.potions.by_seat?Object.entries(info.potions.by_seat).map(([seat,items])=>`<span>${seat} 號女巫 / Witch ${seat}: 解藥 Antidote ${items.save_used?'已使用 / used':'未使用 / available'} · 毒藥 Poison ${items.poison_used?'已使用 / used':'未使用 / available'}</span>`).join('<br>'):`解藥：${info.potions.save_used?'已使用':'未使用'} · 毒藥：${info.potions.poison_used?'已使用':'未使用'}`}<br>本晚狼刀：${info.night.kill??'無'} · 毒藥目標：${info.night.poison??'無'}${info.night.inspection?` · 查驗：${info.night.inspection.seat} 號（${['bad','wolf'].includes(info.night.inspection.alignment)?'壞人陣營':'好人陣營'}）`:''}</p>`;
  } catch(error) {
    if(request === debugRequest && $('#debug-panel')) {
      const message = error.status === 404 ? 'DEBUG 尚未載入：伺服器可能仍在執行舊版本。請重新啟動 Python 伺服器，再重試。' : error.message;
      slot.innerHTML = `<p class="dialog-error">${escape(message)}</p><button class="icon-button" id="retry-debug">重試 DEBUG</button>`;
      $('#retry-debug').onclick = loadDebug;
    }
  } finally { if(slot.isConnected) bilingualize(slot); }
}
function applyDebugControl(){
  if(state?.room?.mode!=='multi' || !debugEnabled || !debugControl)return;
  const claimed=debugControl.protected_seats;
  const action=$('#stage-action');
  if(action && ['reveal','wolves','witch','seer','hunter','vote','runoff'].includes(state.phase))action.hidden=!debugControl.can_act;
  const voting=['vote','runoff'].includes(state.phase) && claimed.some(s=>state.players.some(p=>p.seat===s&&p.alive));
  if($('.quick-vote'))$('.quick-vote').hidden=voting;
  const note=$('#solo-debug-note');
  if(note && claimed.length)note.innerHTML=`已批准玩家保留自己的角色及投票。DEBUG 只代操作其餘座位。${!debugControl.can_act?' 本回合等待玩家裝置。':''}<span class="english-subtext" lang="en">Approved players keep their own roles and votes. DEBUG simulates the remaining seats.${!debugControl.can_act?' Waiting for the player’s device.':''}</span><span class="english-subtext">玩家控制 / Player-controlled seats: ${claimed.join(', ')}</span>`;
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message) { setBilingualText($('#toast'), message); $('#toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 5000); }

const narrator = new Narrator({context:()=>({enabled:voice && mainSpeaker && !(session?.viewer && state?.room?.mode==='multi') && !playerPage,state,session,profile:voiceProfile,language:speechLanguage,allowFallback,volume:voiceVolume()}),status:text=>{const el=$('#voice-status');if(el)setBilingualText(el,text);}});
bindVolume(narrator);
const hostChat=new RoomChat({context:()=>({id:session?.id,enabled:!!state?.room?.remote,phase:state?.phase}),request:(suffix,body)=>api(`/api/games/${session.id}/chat${suffix}`,body?{method:'POST',body:JSON.stringify(body)}:{})});
const roomHost = new RoomHost({api,session:()=>session,refresh:()=>refresh(),dialog:$('#room-dialog')});
async function api(path, options = {}) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {...options,signal:controller.signal,headers:{'Content-Type':'application/json',...(session ? {Authorization:`Bearer ${session.token}`} : {}),...options.headers}});
    const json = await response.json();
    if (!response.ok) {
      const error = new Error(typeof json.detail === 'string' ? json.detail : '請檢查輸入，再試一次。');
      error.status = response.status;
      throw error;
    }
    return json;
  } catch (e) { if (e.name === 'AbortError') throw new Error('連線逾時，請檢查網絡並重新同步。'); throw e; }
  finally { clearTimeout(timeout); }
}
function showPrivate() { bilingualize(privateDialog); privateDialog.showModal(); focusRoleCard(privateDialog); }
function closePrivate() {
  hostPrivate=false;hostPlayerTurn=null;
  privateDialog.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
  privateDialog.close(); privateDialog.replaceChildren();
}
const coverTimer = new NightCoverTimer({
  context:()=>state && session ? {key:`${session.id}:${state.day}:${state.phase}:${state.version}`,phase:state.phase,version:state.version,viewer:session.viewer,busy,hidden:document.hidden} : null,
  readPrivate:()=>api(`/api/games/${session.id}/cover`),
  pass:()=>action('inactive_pass'), onError:error=>toast(error.message)
});
async function setState(next, starting = false) {
  await claimSpeaker(next);
  const changed = narrationChanged(state,next);
  const sweep = shouldSweep(state?.phase, next.phase, starting);
  const sky = skyChange(state?.phase, next.phase);
  const render = () => { state = next; renderGame(); if(sweep)window.scrollTo(0,0); loadDebug(); coverTimer.enter(); if (changed) narrator.speak(); };
  if (sweep) await wolfSweep(render);
  else if(sky) await skySweep(render,sky);
  else render();
}
async function action(name, data = {}, visual = null) {
  if (busy) return;
  const own=hostPrivate,turn=hostPlayerTurn;
  busy = true; narrator.stop();
  if(visual) {
    const version=state.version;
    visual.form.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    let finished;
    try { finished=(await Promise.all((visual.targets || [visual.target]).map(target=>roleEffect(visual.form,visual.role,target)))).every(Boolean); }
    catch(error) { busy=false;visual.form.querySelectorAll('button,input').forEach(el=>el.disabled=false);toast(error.message);return; }
    if(!finished || state.version!==version) { busy=false; visual.form.querySelectorAll('button,input').forEach(el=>el.disabled=false); return; }
  }
  closePrivate();
  app.setAttribute('aria-busy','true'); app.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    const result=await api(`/api/games/${session.id}/${own?'host-player/actions':'actions'}`, {method:'POST',body:JSON.stringify(own?{turn_key:turn.turn_key,action:state.phase==='reveal'&&name==='ack'?'ready':name,data}:{version:state.version,action:name,data,debug:debugEnabled})});
    await setState(own?result.state:result);
  }
  catch (e) { toast(e.message); await refresh(); }
  finally { busy = false; app.removeAttribute('aria-busy'); app.querySelectorAll('button').forEach(b => b.disabled = false); }
}
async function refresh() {
  if (!session || pollBusy) return;
  pollBusy = true;
  try {
    const next = await api(`/api/games/${session.id}`);
    if (!state || next.version !== state.version) { closePrivate(); await setState(next); }
  } catch (e) { toast(e.message); }
  finally { pollBusy = false; }
}
function setup() {
  coverTimer.reset();hostChat.mount(null);clearNarratorPanel(true);
  clearInterval(timerInterval);
  applyTheme('lobby'); updateDebugButton(); ++debugRequest;
  $('#session-tools').replaceChildren(); $('#session-tools').hidden=true;
  $('.topbar').classList.remove('in-game');
  app.innerHTML = `<section class="hero"><div class="hero-content"><p class="eyebrow">A SOCIAL DEDUCTION RITUAL</p><h1>When the moon rises,<br><em>trust no one.</em></h1><p class="zh">天黑請閉眼，故事即將開始。</p><p class="lede">Gather your friends. Keep your secrets.<br>Your Cantonese game master takes care of the night.</p><span class="hero-chip"><i></i> 5–16 PLAYERS <span> / </span> ONE SHARED NIGHT</span><div class="hero-guides"><button class="icon-button guide-launch" id="learn-game" type="button"><span aria-hidden="true">?</span> 玩法指南 · How to play</button><button class="icon-button guide-launch" id="learn-archive" type="button">▤ 角色圖鑑 · Character archive</button></div></div><span class="hero-mark">Somewhere in the village, wolves are waiting.</span><button class="primary hero-start" id="hero-start" type="button"><span>開始遊戲 · Start game</span><span aria-hidden="true">↗</span></button></section>
  <div class="section-heading"><div><h2><span class="number">01 /</span> Assemble the village <span class="muted">集結村莊</span></h2><p>Choose your cast. Every seat has a secret to keep.</p></div><div class="presets">${[6,9,12].map(n=>`<button class="preset ${JSON.stringify(counts)===JSON.stringify(presets[n])?'active':''}" data-preset="${n}">${n} 人局</button>`).join('')}</div></div>
  <div class="setup-grid"><section><div class="role-grid">${Object.keys(labels).map(r=>`<article class="role-card">${characterArt(r,'cast')}<h3>${labels[r]}</h3><small>${r}</small><div class="stepper"><button data-role="${r}" data-delta="-1" aria-label="減少${labels[r]} / Fewer ${r}">−</button><output aria-label="${labels[r]}人數 / ${r} count">${counts[r]}</output><button data-role="${r}" data-delta="1" aria-label="增加${labels[r]} / More ${r}">+</button></div></article>`).join('')}</div><div class="setup-note"><span>☾</span><span>身份由系統隨機分配，每人私下查看自己的身份。<br>主持人亦可參與。同場由主裝置旁白；遠端各自播放，並可文字討論。亦可切換單機交接。<span class="english-subtext" lang="en">The host plays too. In person, one device narrates; remote players have their own narration and text chat. Shared-device play is also available.</span></span></div>${privacyReminder()}<div class="steps"><div class="step"><span class="n">I.</span><div><strong>Take your seat · 入座</strong><p>設定角色，集結你的村莊。</p></div></div><div class="step"><span class="n">II.</span><div><strong>Keep your secret · 守密</strong><p>輪流揭開只屬於你的身份。</p></div></div><div class="step"><span class="n">III.</span><div><strong>Survive the night · 生存</strong><p>跟隨語音，尋找藏身的狼人。</p></div></div></div></section>
  <aside class="panel house-rules"><details id="rules-disclosure"><summary class="rules-heading"><p class="eyebrow">YOUR TABLE, YOUR RULES</p><h3>今晚的約定<span class="english-subtext" lang="en">Tonight’s house rules</span></h3><p class="muted">Settle the rules before the first night.</p><span class="rules-chevron" aria-hidden="true">⌄</span><span id="rules-summary" class="rules-summary"></span></summary><div class="rules-settings"><label class="rule-line">語音語言<select id="speech-language"><option value="yue">廣東話 Cantonese</option><option value="en">English 英語</option></select></label><fieldset class="play-modes"><legend>遊玩方式<span class="english-subtext" lang="en">Play mode · choose one</span></legend>${[['single','共用一部裝置','Shared device','輪流查看身份，由同一部裝置主持。','Pass one device around; it narrates the game.'],['multi','同場各用手機','In-person phones','每人用自己的手機，一部主裝置播放旁白。','Each player uses a phone; only the main device narrates.'],['remote','遠端連線','Remote play','每人自行播放旁白，並設文字聊天。','Each device narrates independently, with text chat.']].map(([value,zh,en,tip,tipEn])=>`<label class="play-mode"><input type="radio" name="play-mode" value="${value}" ${value==='remote'?'checked':''}><span><strong>${zh}<span class="english-subtext" lang="en">${en}</span></strong><small>${tip}<span class="english-subtext" lang="en">${tipEn}</span></small></span></label>`).join('')}</fieldset><label class="rule-line">娛樂模式<input id="fun-mode" type="checkbox"></label><p class="fineprint">允許多位預言家、女巫及獵人；狼人仍須少於好人。</p><p class="fineprint">同角色按座位順序逐一操作，每位女巫有獨立藥水。</p><label class="rule-line">啟用遺言<input id="last-words" type="checkbox" checked></label><p class="fineprint">首夜死亡及白天被票出局者有遺言；白天被技能帶走及第二晚起死亡者沒有。<span class="english-subtext" lang="en">First-night casualties and voted-out players get last words. Daytime skill victims and deaths from night two onward do not.</span></p><label class="rule-line">允許狼人空刀<input id="wolf-abstain" type="checkbox" checked></label><label class="rule-line">女巫每晚限用一瓶藥<input id="potion-limit" type="checkbox" checked></label><p class="fineprint">關閉後可同晚使用雙藥；每種藥全局仍限一次。<span class="english-subtext" lang="en">Turn off to use both potions on the same night. Each potion remains single-use per game.</span></p><label class="rule-line">女巫可以自救<input id="self-save" type="checkbox" checked></label><label class="rule-line">女巫被刀當晚可行動<input id="witch-acts" type="checkbox" checked></label><label class="rule-line">狼人達到平票人數即勝<input id="parity" type="checkbox" checked></label><label class="rule-line">討論時間（秒）<input id="duration" type="number" min="15" max="600" value="90"></label></div></details><button class="primary start-button" id="create"><span>Begin the night · 開始遊戲</span><span>↗</span></button><p class="fineprint"><span id="total">${Object.values(counts).reduce((a,b)=>a+b,0)}</span> players at the table · 自動儲存進度</p><p id="setup-error" class="action-error" role="alert"></p></aside></div>`;
  app.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{counts={...presets[b.dataset.preset]}; preserveRules(setup);});
  app.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{const r=b.dataset.role;counts[r]=Math.min(roleLimit(r,$('#fun-mode').checked),Math.max(0,counts[r]+Number(b.dataset.delta)));preserveRules(setup);});
  $('#create').onclick = createGame;$('#hero-start').onclick=createGame;
  $('#learn-game').onclick=()=>showGuide(debugEnabled);
  updateGuideLabels(debugEnabled);
  $('.house-rules').addEventListener('change',updateRuleSummary);$('.house-rules').addEventListener('input',updateRuleSummary);
  $('#learn-archive').onclick=openArchive;
  $('#fun-mode').onchange=()=>{if(!$('#fun-mode').checked){for(const role of ['seer','witch','hunter'])counts[role]=Math.min(counts[role],1);}preserveRules(setup);};
  $('#speech-language').value=speechLanguage;
  $('#speech-language').onchange=()=>{speechLanguage=$('#speech-language').value;voiceProfile=preferredVoice(speechLanguage);sessionStorage.setItem('moonfall-speech-language',speechLanguage);updateRuleSummary();};
  try {
    const saved=JSON.parse(sessionStorage.getItem('moonfall-session'));
    if(saved?.id){
      const resume=document.createElement('button');resume.className='secondary new-session';resume.textContent='↩ 繼續目前遊戲 · Resume your village';
      resume.onclick=()=>{session=saved;history.replaceState(null,'',`/#game=${session.id}`);refresh();};app.querySelector('.hero').after(resume);
    }
  }catch{}
  bilingualize(app);updateRuleSummary();
}
function preserveRules(render) {
  const mode=selectedPlayMode(),expanded=$('#rules-disclosure').open;
  const values = ['fun-mode','last-words','potion-limit','wolf-abstain','self-save','witch-acts','parity','duration'].map(id=>[id,$('#'+id).type==='checkbox'?$('#'+id).checked:$('#'+id).value]);
  render(); values.forEach(([id,v])=>{if($('#'+id).type==='checkbox')$('#'+id).checked=v;else $('#'+id).value=v;});
  $(`input[name="play-mode"][value="${mode}"]`).checked=true;$('#rules-disclosure').open=expanded;updateRuleSummary();
}
async function createGame() {
  if (busy) return;
  busy = true; document.querySelectorAll('#create,#hero-start').forEach(button=>button.disabled=true);
  const rules = {witch_one_potion_per_night:$('#potion-limit').checked,last_words:$('#last-words').checked,fun_mode:$('#fun-mode').checked,wolves_can_abstain:$('#wolf-abstain').checked,witch_self_save:$('#self-save').checked,witch_acts_when_killed:$('#witch-acts').checked,parity_wins:$('#parity').checked,discussion_seconds:Number($('#duration').value)};
  try {
    const result = await api('/api/games',{method:'POST',body:JSON.stringify({counts,rules,mode:selectedPlayMode()})});
    session = {id:result.id,token:result.host_token,viewerToken:result.viewer_token,viewer:false};
    sessionStorage.setItem('moonfall-session',JSON.stringify(session));
    history.replaceState(null,'',`/#game=${session.id}`); await setState(result.state, true);
  } catch(e) { setBilingualText($('#setup-error'),e.message);toast(e.message);document.querySelectorAll('#create,#hero-start').forEach(button=>button.disabled=false); }
  finally { busy=false; }
}
function renderGame() {
  clearNarratorPanel();
  clearInterval(timerInterval);
  const p = state.phase, night = themeForPhase(p) === 'night';
  const debug = debugEnabled && !session.viewer;
  const multi = state.room?.mode==='multi';
  if(multi && session.viewer){voice=false;narrator.stop();}
  $('#sound').hidden=multi && session.viewer;
  $('#volume-control').hidden=multi && session.viewer;
  $('.local-badge').textContent=state.room?.remote?'遠端遊戲 · REMOTE TABLE':multi?'連線房間 · CONNECTED TABLE':'本地遊戲 · LOCAL TABLE';
  applyTheme(themeForPhase(p)); updateDebugButton();
  const stages = [['reveal','身份'],['wolves','狼人'],['witch','女巫'],['seer','預言家'],['dawn','天亮'],['discussion','討論'],['vote','投票']];
  if(p==='last_words')stages.splice(5,0,['last_words','遺言']);
  const actualStage = p==='runoff'?'vote':p==='hunter'?'dawn':p;
  const living = state.players.filter(p=>p.alive).length;
  $('.topbar').classList.add('in-game');
  $('#session-tools').hidden=false;
  $('#session-tools').innerHTML = !session.viewer ? '<button class="icon-button" id="audience">↗ 觀眾畫面<span class="english-subtext" lang="en">Audience view</span></button><button class="icon-button" id="new-game">＋ 新遊戲<span class="english-subtext" lang="en">New game</span></button>' : '<span class="status-pill">觀眾 · AUDIENCE</span>';
  app.innerHTML = `<div class="session-header"><div><p class="eyebrow">${session.viewer?'THE VILLAGE VIEW':'THE GAME MASTER’S TABLE'}</p><h1>村莊紀事 <span class="muted">/ 第 ${state.day} ${night?'晚':'輪'}</span></h1></div></div>
  ${p==='finished'?`<div class="winner-banner"><p class="eyebrow">THE TRUTH, AT LAST</p><h2>${{village:'好人陣營勝利',wolves:'狼人陣營勝利',draw:'雙方全滅 · 平局'}[state.winner]}</h2><p>月落之後，每個秘密都有了答案。完整身份與死亡原因已公開。</p></div>`:`<div class="progress">${stages.map(([key,text])=>`<span class="${key===actualStage?'current':''}">${text}</span>`).join('')}</div>`}
  ${session.viewer?'<div class="viewer-note">這是公開觀眾畫面。私人行動與查驗結果不會出現在這裡。每 3 秒同步。</div>':''}
  <div class="game-hero"><span>${night?'The woods are quiet. Too quiet.':'A new light. The same secrets.'}</span><small>${night?'血月之下，請閉上眼睛。':'晨光已至，請睜開眼睛。'}</small></div>
  ${debug?'<section id="debug-panel" class="debug-panel" aria-label="DEBUG 主持人身份表 / Host role sheet"></section>':''}
  <div class="game-grid"><section><div class="table-panel"><div class="table-top"><p class="eyebrow">THE VILLAGE <span class="muted">/ 村莊座位</span></p><span class="live-count"><i></i>${living} / ${state.players.length} 存活 <span class="count-en" lang="en">/ Alive</span></span></div><div class="village">${state.players.map(pl=>`<article class="seat ${!pl.alive?'dead':''} ${pl.role==='wolf'?'revealed-wolf':''}"><div class="avatar">${p==='finished'?symbols[pl.role]:pl.revealed_role==='hunter'?symbols.hunter:'♙'}</div><strong>SEAT ${String(pl.seat).padStart(2,'0')} · ${pl.seat} 號</strong><small>${chineseSeatText(pl,p==='finished',state.events)}</small><small class="seat-english" lang="en">${englishSeatText(pl,p==='finished',state.events)}</small></article>`).join('')}</div></div>
  <div class="narration"><span class="sigil">◖</span><div><span class="micro">THE NARRATOR · 語音主持</span><p>${escape(speechLanguage==='en'?state.narration_en:state.narration)}</p><div class="voice-settings"><label for="speech-language">語音語言</label><select id="speech-language"><option value="yue">廣東話 Cantonese</option><option value="en">English 英語</option></select><label for="voice-profile">聲線</label><select id="voice-profile"><option value="original">原版廣東話女聲</option><option value="narrator">廣東話男聲（較慢）</option></select><label class="voice-fallback"><input id="voice-fallback" type="checkbox">允許本機備用語音（較機械）</label></div><small id="voice-status">${voice?'語音已啟用':'語音關閉 · 可按右上角啟用'}</small></div></div>
  <section class="chronicle"><h3>Day & night chronicle <span class="muted">日夜紀行</span></h3>${[...state.events].reverse().map(e=>`<div class="event"><time>ROUND ${String(e.day).padStart(2,'0')}</time><span>${escape(e.text)}</span></div>`).join('')}</section></section>
  <aside class="panel stage-panel ${p==='reveal'?'handoff-stage':''}"><p class="eyebrow">${p==='finished'?'THE EPILOGUE':night?'THE NIGHT RITUAL':'THE NEXT CHAPTER'}</p><div class="phase-symbol" aria-hidden="true">${({reveal:'✧',wolves:'☾',witch:'⚗',seer:'✧',dawn:'☼',hunter:'⌖',last_words:'✎',discussion:'☼',vote:'⚖',runoff:'⚖',finished:'☾'})[p]}</div><h2>${names[p]}</h2>${state.role_turn?`<p class="notice">同角色回合 ${state.role_turn.number} / ${state.role_turn.total}<span class="english-subtext" lang="en">Role turn ${state.role_turn.number} of ${state.role_turn.total} · Take turns in seat order</span></p>`:''}${p==='reveal'?`<div class="handoff-seat" aria-label="${state.reveal_seat} 號玩家 / Player ${state.reveal_seat}"><span class="handoff-seat-label">目前玩家 · CURRENT PLAYER</span><strong>${state.reveal_seat}</strong></div>`:''}<p class="muted">${descriptions[p]}</p>${p==='reveal'?`<p class="notice">現在輪到 ${state.reveal_seat} 號玩家。其他人請移開視線。</p>`:''}${p==='hunter'?`<p class="notice">獵人：${state.hunter} 號</p>`:''}${p==='last_words'?`<div class="handoff-seat"><span class="handoff-seat-label">遺言座位 · LAST WORDS</span><strong>${state.last_words_seat}</strong></div>`:''}${p==='runoff'?`<p class="notice">平票座位：${state.runoff.join('、')} 號</p>`:''}
  ${p==='discussion'?(debug?'<p class="notice">DEBUG：略過討論倒數，可直接進入投票。</p>':'<div class="timer" id="timer">01:30</div><div class="timer-controls"><button class="icon-button" id="timer-toggle">開始計時</button><button class="icon-button" id="timer-reset">重設</button></div>'):''}
  ${!session.viewer && ['vote','runoff'].includes(p)?countedVoteMarkup():''}
  ${!session.viewer && p!=='finished'?`<button class="primary" id="stage-action">${({reveal:'私下查看身份 ↗',wolves:'狼人私人行動 ↗',witch:'女巫私人行動 ↗',seer:'預言家私人行動 ↗',dawn:'公布昨晚結果 →',hunter:'決定最後一槍 ↗',discussion:'開始投票 →',last_words:'遺言結束，繼續 →',vote:'逐票記錄（可選） ↗',runoff:'逐票記錄（可選） ↗'})[p]}</button>`:''}
  ${session.viewer?'<p class="notice">等待主持人推進遊戲。</p>':'<p class="fineprint">私人畫面不會讀出秘密。<br>切換分頁時會自動遮蔽。</p>'}<button class="secondary" id="replay">↻ 重播公開旁白</button></aside></div>`;
  $('#stage-action')?.addEventListener('click',()=>{if(p==='last_words')action('last_words_done');else if(p==='dawn')action('dawn');else if(p==='discussion')action('vote');else if(['vote','runoff'].includes(p))openBallots();else openPrivate();});
  if(p==='reveal' && debug) {
    const skip = document.createElement('button');
    skip.id = 'skip-reveal'; skip.className = 'secondary';
    skip.textContent = '跳過身份交接（DEBUG） →';
    skip.onclick = () => action('debug_skip_reveal');
    $('#stage-action').after(skip);
  }
  $('#speech-language').value=speechLanguage;
  $('#speech-language').onchange=()=>{speechLanguage=$('#speech-language').value;voiceProfile=preferredVoice(speechLanguage);sessionStorage.setItem('moonfall-speech-language',speechLanguage);narrator.stop();renderGame();loadDebug();if(voice)narrator.speak();};
  if(speechLanguage==='en') { $('#voice-profile').options[0].textContent='英語女聲 · English female'; $('#voice-profile').options[1].textContent='英語男聲（較慢） · English male (slower)'; }
  $('#voice-profile').value=voiceProfile;
  $('#voice-fallback').checked=allowFallback;
  $('#voice-profile').onchange=()=>{voiceProfile=$('#voice-profile').value;sessionStorage.setItem(`moonfall-voice-${speechLanguage}`,voiceProfile);narrator.stop();if(voice)narrator.speak();};
  $('#voice-fallback').onchange=()=>{allowFallback=$('#voice-fallback').checked;sessionStorage.setItem('moonfall-voice-fallback',String(allowFallback));narrator.stop();if(voice)narrator.speak();};
  $('#replay').onclick=()=>{voice=true;updateVoice();narrator.speak({replay:true});};
  $('#audience')?.addEventListener('click',()=>{
    const url=`${location.origin}/#watch=${session.id}&key=${session.viewerToken}`;
    privateDialog.innerHTML=`<p class="eyebrow">THE VILLAGE VIEW</p><h2>讓大家看見村莊。</h2><p>這個連結只顯示公開資訊。請在另一個視窗打開，或複製給觀眾。另一部裝置需要可連線的伺服器網址。</p><label class="muted" for="viewer-url">觀眾專用連結</label><input class="share-url" id="viewer-url" readonly value="${escape(url)}"><div class="button-row"><button class="secondary" id="copy-viewer">複製連結</button><a class="primary share-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">另開觀眾畫面 ↗</a></div><p><a class="muted" href="${escape(url)}">在此分頁預覽 →</a></p><button class="icon-button" id="close-share">返回主持畫面</button>`;
    showPrivate();$('#close-share').onclick=closePrivate;
    $('#copy-viewer').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('觀眾連結已複製。');}catch{$('#viewer-url').select();toast('請手動複製已選取的連結。');}};
  });
  $('#new-game')?.addEventListener('click',()=>{
    privateDialog.innerHTML='<p class="eyebrow">ANOTHER NIGHT</p><h2>開一局新遊戲？</h2><p>目前遊戲會保留在伺服器，但這個分頁將開始新局。要保留舊局的操作權，請先保留目前分頁。</p><div class="button-row"><button class="secondary" id="cancel-new">繼續本局</button><button class="primary" id="confirm-new">開新局</button></div>';
    showPrivate();$('#cancel-new').onclick=closePrivate;$('#confirm-new').onclick=()=>{closePrivate();narrator.stop();session=null;state=null;sessionStorage.removeItem('moonfall-session');history.replaceState(null,'','/');setup();};
  });
  if(p==='discussion' && !debug && !session.viewer) initTimer();
  if(p==='discussion' && debug) $('#stage-action').textContent = '跳過討論（DEBUG） →';
  bindCountedVote();
  if(!session.viewer){
    const control=document.createElement('button');control.className='icon-button';control.id='room-manage';control.textContent='房間／切換裝置 · Room / devices';control.onclick=()=>roomHost.open();$('#session-tools').prepend(control);
    if(multi){
      const mine=document.createElement('button');mine.className='secondary';mine.id='host-own-role';mine.textContent='查看我的身份 · View my role';mine.onclick=()=>openHostPrivate(true);$('.stage-panel').prepend(mine);
      api(`/api/games/${session.id}/host-player`,{method:'POST',body:'{}'}).then(info=>{if($('#host-own-role'))$('#host-own-role').textContent=`查看我的身份 · View my role · ${info.seat} 號 / Seat ${info.seat}`;if($('#host-own-action'))$('#host-own-action').hidden=!info.can_act;}).catch(e=>toast(e.message));
      const panel=document.createElement('section');panel.className='room-panel';panel.innerHTML=`<h2>各用手機 · Multi device</h2><p class="room-status">已批准 ${state.room.connected} / ${state.players.length} 位玩家 · Players approved${p==='reveal'?` · 已準備 ${state.room.ready} / ${state.players.length} Ready`:''}${['vote','runoff'].includes(p)?` · 已投票 ${state.room.votes_received} / ${living} Votes received`:''}</p><p class="room-status">主裝置播放旁白及推進公開階段。玩家在自己手機操作。<span class="english-subtext" lang="en">This main device narrates and controls public phases. Players act on their own phones.</span></p><button class="secondary" id="room-lobby">邀請／批准玩家 · Invite / approve players</button>`;
      $('.session-header').before(panel);$('#room-lobby').onclick=()=>roomHost.open();
      if(!debug && ['reveal','wolves','witch','seer','hunter','vote','runoff'].includes(p)){
        $('#stage-action')?.remove();$('.quick-vote')?.remove();$('.handoff-stage .handoff-seat')?.remove();$('.handoff-stage .notice')?.remove();
        $('.stage-panel > .muted').innerHTML='等待玩家手機操作。<span class="english-subtext" lang="en">Waiting for the players’ devices.</span>';
      }
      if(debug){const note=document.createElement('p');note.className='notice';note.id='solo-debug-note';note.innerHTML='單人 DEBUG：可在主裝置代操作所有角色、略過身份交接及討論，並輸入投票結果。無須玩家加入。<span class="english-subtext" lang="en">Solo DEBUG: act for every role on this device, skip reveals/discussion and enter vote results. No joined players required.</span>';$('.stage-panel').prepend(note);}
      if(hasPlayerAction(p)){const ownAction=document.createElement('button');ownAction.className='primary';ownAction.id='host-own-action';ownAction.textContent=actionLabel(p);ownAction.onclick=()=>openHostPrivate(false);$('.stage-panel').append(ownAction);}
      $('#replay').hidden=false;
    }
  } else if(multi){$('#replay').hidden=true;$('.voice-settings').hidden=true;}
  const table=$('.table-panel'),record=$('.chronicle');if(table&&record){table.before(record);record.insertAdjacentHTML('afterend',voteRecords(state.vote_history));}
  if(state.room?.remote){const chat=document.createElement('section');chat.className='room-chat';chat.id='host-chat';$('.game-grid > section').prepend(chat);hostChat.mount(chat);}else hostChat.mount(null);
  if(state.room?.remote){const note=$('.room-panel .room-status:nth-of-type(2)');if(note)note.innerHTML='遠端模式：每位玩家自行控制語音及音量，使用文字討論。<span class="english-subtext">Remote mode: each player controls their own narration and volume, with text discussion.</span>';}
  bilingualize(app);mountNarratorPanel($('.narration'),$('#replay'));
}
function targetChoices(seats, optional=true) {
  return `<div class="target-grid">${seats.map(s=>`<label><input type="radio" name="target" value="${s}" ${!optional?'required':''}><span>${s} 號</span></label>`).join('')}${optional?'<label class="pass"><input type="radio" name="target" value="" checked><span>不選擇目標 / 放棄</span></label>':''}</div>`;
}
function chosen(form) { const raw=new FormData(form).get('target'); return raw ? Number(raw) : null; }
async function openHostPrivate(roleOnly=false){
  if(busy)return;narrator.stop();
  try{const detail=await api(`/api/games/${session.id}/host-player/private`);if(detail.state.version!==state.version)await setState(detail.state);narrator.stop();renderHostPrivate(detail,roleOnly);showPrivate();}catch(e){toast(e.message);}
}
function renderHostPrivate(detail,roleOnly=false){
  if(roleOnly){privateDialog.innerHTML=`<p class="eyebrow">MY SEAT · 我的座位 ${detail.seat}</p>${roleCard(detail.role,detail.seat)}${roleTip(detail.role)}<button class="secondary" id="host-mask">收起 · Hide</button>`;$('#host-mask').onclick=closePrivate;hostPrivate=true;hostPlayerTurn=detail;return;}
  if(detail.can_act && !['vote','runoff'].includes(state.phase)){
    renderPrivate(state.phase==='reveal'?{seat:detail.seat,role:detail.role}:detail.info);

    if(state.phase==='reveal')$('#ack').textContent='記住身份，準備好了 · Ready';
  }else{
    privateDialog.innerHTML=`<p class="eyebrow">MY SEAT · 我的座位 ${detail.seat}</p>${detail.can_act?`<h2>我的投票 · My vote</h2><form id="host-own-ballot">${targetChoices(detail.info.targets)}<button class="primary">確認投票 · Confirm vote</button></form>`:'<p class="notice">等待自己的回合 · Wait for your turn</p>'}<button class="secondary" id="host-mask">收起 · Hide</button>`;
    $('#host-mask').onclick=closePrivate;
    $('#host-own-ballot')?.addEventListener('submit',e=>{e.preventDefault();action('ballot',{target:chosen(e.currentTarget)});});
  }
  hostPrivate=true;hostPlayerTurn=detail;bilingualize(privateDialog);
}
async function openPrivate() {
  if (busy) return;
  coverTimer.touch();
  narrator.stop();
  privateDialog.innerHTML=`<p class="eyebrow">PRIVATE HANDOFF · 私人交接</p><h2>確認只有${state.phase==='reveal'?`${state.reveal_seat} 號玩家`:state.phase==='hunter'?`${state.hunter} 號獵人`:names[state.phase].replace('行動','').replace('查驗','')}在看畫面。</h2><p>請先讓其他人移開視線，再揭開私人資訊。</p><button class="primary" id="uncover">我已準備好 · 揭開</button><button class="secondary new-session" id="cover">返回公開畫面</button>`;
  showPrivate(); $('#cover').onclick=closePrivate;
  $('#uncover').onclick=async()=>{
    $('#uncover').disabled=true;
    try { const info=await api(`/api/games/${session.id}/private`); if(privateDialog.open)renderPrivate(info); }
    catch(e){closePrivate();toast(e.message);}
  };
}
function renderPrivate(info) {
  const phase=state.phase;
  let content='';
  if(phase==='reveal') content=`${roleCard(info.role,info.seat)}<p class="private-seat">${info.role==='wolf'?'你藏身於村莊之中。與同伴一起活到最後。':'守護村莊，找出藏在你們之間的狼人。'}</p>${roleTip(info.role)}<button class="primary" id="ack">記住了 · 收起並交給下一位</button>`;
  if(phase==='wolves') content=`<h2>今晚，誰將消失？</h2><p>你的狼人同伴：${info.wolves.join('、')} 號。${info.can_abstain?'可以空刀，亦可選狼人。':'本局不允許空刀，必須選擇一位存活玩家。'}</p>${info.choices?`<p class="notice">已提交選擇 / Pack choices: ${Object.entries(info.choices).map(([s,t])=>`${s} → ${t??'空刀 / Pass'}`).join(' · ')||'—'}</p>`:''}<form id="private-form">${targetChoices(info.targets,info.can_abstain)}<button class="primary">鎖定目標 · 收起畫面</button></form>`;
  if(phase==='witch') content=`<h2>女巫的抉擇</h2>${info.active?`<p class="notice">${info.kill?`今晚被刀：${info.kill} 號`:'今晚沒有狼人擊殺目標。'}</p><p>${state.rules.witch_one_potion_per_night===false?'本局可同晚使用解藥及毒藥，各限全局一次。解藥只能救狼人目標；毒藥可選任意存活玩家。':'每晚最多用一瓶。解藥只能救狼人目標；毒藥可選任意存活玩家。'}</p>`:'<p class="notice">本晚沒有可行動的女巫，請維持相同交接流程。</p>'}<form id="private-form">${info.can_save?`<label class="check-label"><input type="checkbox" name="save">使用解藥，救回今晚被刀玩家</label><div class="save-target" data-seat="${info.kill}"><span>解藥目標 · ANTIDOTE TARGET</span><strong>${info.kill}</strong></div>`:'<p class="muted">本晚解藥不可用。</p>'}${info.can_poison?`<p class="micro">毒藥目標（可放棄）</p>${targetChoices(info.targets)}`:'<p class="muted">本晚毒藥不可用。</p>'}<p class="dialog-error" id="private-error" role="alert"></p><button class="primary">確認用藥決定 · 收起畫面</button></form>`;
  if(phase==='seer') {
    if(!info.active) content='<h2>今晚沒有可行動的預言家。</h2><p>請維持相同交接流程，確認後關閉私人畫面。</p><button class="primary" id="ack">確認 · 收起畫面</button>';
    else if(info.inspection) content=`<h2>迷霧之後的真相。</h2><p class="private-seat">你查驗了 ${info.inspection.seat} 號</p><div class="private-role">${['bad','wolf'].includes(info.inspection.alignment)?'壞人陣營':'好人陣營'}</div><p class="notice">請記住結果。確認後即清除畫面。</p><button class="primary" id="ack">確認結果 · 收起畫面</button>`;
    else content=`<h2>你想看穿誰？</h2><p>選一位其他存活玩家。結果只會告訴你陣營。</p><form id="private-form">${targetChoices(info.targets,false)}<button class="primary">查驗身份</button></form>`;
  }
  if(phase==='hunter') content=`<h2>獵人 ${state.hunter} 號的最後一槍。</h2><p>你可以帶走一位存活玩家，或放棄開槍。</p><form id="private-form">${targetChoices(info.targets)}<button class="danger">確認最後決定</button></form>`;
  if(['witch','seer'].includes(phase) && !info.active) content=`<h2>維持夜間掩護操作</h2><p class="notice">本回合不能使用能力。請照常選擇座位及按確認，避免點擊聲洩漏資訊。若沒有人操作，10 秒後自動繼續。</p><form id="private-form">${targetChoices(state.players.filter(p=>p.alive).map(p=>p.seat),false)}<button class="primary">完成掩護操作</button></form>`;
  const actor=info.actor_seat?`<p class="private-seat">${info.actor_seat} 號玩家 / PLAYER ${info.actor_seat}</p>`:'';
  privateDialog.innerHTML=`<p class="eyebrow">FOR YOUR EYES ONLY · 只供目前角色</p>${actor}${content}<button class="icon-button new-session" id="mask">返回</button>`;
  bilingualize(privateDialog);
  $('#mask').onclick=closePrivate;
  $('#ack')?.addEventListener('click',()=>action('ack'));
  $('#private-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const form=e.currentTarget, seat=chosen(form);
    if(busy)return;
    const visual={form,role:phase,target:seat};
    if(['witch','seer'].includes(phase) && !info.active) { action('inactive_pass',{},visual); return; }
    if(phase==='witch') {
      const save=new FormData(form).get('save')==='on';
      if(state.rules.witch_one_potion_per_night!==false && save && seat!==null){setBilingualText($('#private-error'),'每晚只可使用一瓶藥。請取消解藥或毒藥目標。');return;}
      visual.target=save?info.kill:seat;
      if(save && seat!==null)visual.targets=[...new Set([info.kill,seat])];
      action('witch',{save,poison:seat},visual);
    } else if(phase==='seer') {
      busy=true; const version=state.version; form.querySelectorAll('button,input').forEach(el=>el.disabled=true);
      try {
        if(!await roleEffect(form,phase,seat) || state.version!==version)return;
        const own=hostPrivate,turn=hostPlayerTurn;
        const result=await api(`/api/games/${session.id}/${own?'host-player/actions':'actions'}`,{method:'POST',body:JSON.stringify(own?{turn_key:turn.turn_key,action:'inspect',data:{target:seat}}:{version:state.version,action:'inspect',data:{target:seat},debug:debugEnabled})});
        state=own?result.state:result;
        const fresh=await api(`/api/games/${session.id}/${own?'host-player/private':'private'}`);
        if(privateDialog.open){if(own)renderHostPrivate(fresh);else renderPrivate(fresh);}
      }catch(error){closePrivate();toast(error.message);await refresh();}
      finally{busy=false;form.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
    } else action(phase==='wolves'?'wolves':'shoot',{target:seat},visual);
  });
}
function countedVoteMarkup() {
  const living=state.players.filter(p=>p.alive).map(p=>p.seat);
  return `<section class="quick-vote"><h3>現場點票結果<span class="english-subtext" lang="en">Votes counted in person</span></h3><p>選擇最高票玩家；平票請選全部最高票座位。不選代表無人出局。</p><form id="vote-result-form"><div class="target-grid">${(state.phase==='runoff'?state.runoff:living).map(n=>`<label><input type="checkbox" name="leaders" value="${n}"><span>${n} 號</span></label>`).join('')}</div><p class="notice" id="vote-result-summary">不選擇座位＝無人出局。</p><button class="primary">確認現場點票結果</button></form></section>`;
}
function bindCountedVote() {
  const quick=$('#vote-result-form');
  if(!quick)return;
  quick.onchange=()=>{
    const selected=[...new FormData(quick).getAll('leaders')];
    const text=selected.length===1?`現場結果：${selected[0]} 號出局。`:selected.length>1?(state.phase==='runoff'?'再次平票：無人出局。':`平票：${selected.join('、')} 號進入加賽。`):'不選擇座位＝無人出局。';
    setBilingualText($('#vote-result-summary'),text);
  };
  quick.onsubmit=e=>{e.preventDefault();action('vote_result',{leaders:[...new FormData(quick).getAll('leaders')].map(Number)});};
}
function openBallots() {
  const living=state.players.filter(p=>p.alive).map(p=>p.seat);
  const voters=state.room?.mode==='multi' && debugEnabled && debugControl?.protected_seats.length ? debugControl.ballot_seats : living;
  privateDialog.innerHTML=`<p class="eyebrow">THE VILLAGE DECIDES</p><h2>${state.phase==='runoff'?'平票加賽':'記錄全體投票'}</h2><p>先核對每人的選擇，再一次提交。空白代表棄權。<span class="english-subtext" lang="en">Confirm these ballots. Blank means abstain.</span>${voters.length!==living.length?'<span class="english-subtext">僅模擬未入座玩家；已批准玩家自行投票。 / Unclaimed seats only; approved players vote on their devices.</span>':''}</p><form id="ballot-form"><div class="ballot-list">${voters.map(s=>`<label class="ballot-row"><span>${s} 號玩家投給</span><select name="${s}"><option value="">棄權</option>${(state.phase==='runoff'?state.runoff:living).map(n=>`<option value="${n}">${n} 號</option>`).join('')}</select></label>`).join('')}</div><div class="button-row"><button class="secondary" type="button" id="cancel-ballot">返回</button><button class="primary">確認全體投票</button></div></form>`;
  showPrivate();$('#cancel-ballot').onclick=closePrivate;
  $('#ballot-form').onsubmit=e=>{e.preventDefault();const ballots=Object.fromEntries([...new FormData(e.currentTarget)].map(([s,t])=>[s,t?Number(t):null]));action('ballots',{ballots});};
}
function initTimer() {
  const key=`moonfall-timer-${session.id}-${state.day}`;
  let timer;
  try{timer=JSON.parse(sessionStorage.getItem(key));}catch{}
  timer ||= {remaining:state.rules.discussion_seconds,deadline:null};
  const save=()=>sessionStorage.setItem(key,JSON.stringify(timer));
  const update=()=>{
    let remaining=timer.deadline?Math.max(0,Math.ceil((timer.deadline-Date.now())/1000)):timer.remaining;
    $('#timer').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
    setBilingualText($('#timer-toggle'),timer.deadline?'暫停計時':'開始計時');
    if(timer.deadline && remaining===0){timer={remaining:0,deadline:null};save();setBilingualText($('#timer-toggle'),'時間到');toast('討論時間到。請主持人開始投票。');}
  };
  $('#timer-toggle').onclick=()=>{if(timer.deadline){timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));timer.deadline=null;}else if(timer.remaining>0)timer.deadline=Date.now()+timer.remaining*1000;save();update();};
  $('#timer-reset').onclick=()=>{timer={remaining:state.rules.discussion_seconds,deadline:null};save();update();};
  update();timerInterval=setInterval(update,250);
}
function updateVoice() { $('#sound').textContent=voice?'◖ 語音開啟 · Voice on':'◖ 語音關閉 · Voice off';$('#sound').setAttribute('aria-pressed',String(voice));sessionStorage.setItem(`moonfall-voice-enabled-${session?.viewer?'viewer':'host'}`,String(voice)); }
$('#sound').onclick=()=>{voice=!voice;updateVoice();if(voice)narrator.speak();else{narrator.stop();narrator.status('語音關閉 · 字幕仍然顯示');}};
$('#help').onclick=()=>showGuide(debugEnabled);
$('#debug').onclick=()=>{
  if(session?.viewer || busy) return;
  debugEnabled=!debugEnabled; ++debugRequest;
  sessionStorage.setItem('moonfall-debug',String(debugEnabled));
  updateDebugButton();
  if(state){renderGame();loadDebug();}
};
privateDialog.addEventListener('click',()=>coverTimer.touch());
privateDialog.addEventListener('input',()=>coverTimer.touch());
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
privateDialog.addEventListener('cancel',()=>{privateDialog.replaceChildren();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){closePrivate();narrator.stop();}else if(session){refresh();coverTimer.check();}});
window.addEventListener('pagehide',()=>narrator.dispose());
async function boot() {
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('join') || hash.has('player')) {narrator.stop();await startPlayer(hash);return;}
  if(hash.has('watch') && hash.has('key')) {
    session={id:hash.get('watch'),token:hash.get('key'),viewer:true};
    sessionStorage.setItem('moonfall-viewer',JSON.stringify(session));
    history.replaceState(null,'',`/#watch=${session.id}`);
  } else {
    try {session=JSON.parse(sessionStorage.getItem(hash.has('watch')?'moonfall-viewer':'moonfall-session'));}catch{}
    if(session && (hash.get('watch')||hash.get('game'))!==session.id)session=null;
  }
  const savedVoice=sessionStorage.getItem(`moonfall-voice-enabled-${session?.viewer?'viewer':'host'}`);
  voice=savedVoice===null?!session?.viewer:savedVoice==='true';updateVoice();
  if(session){
    try{await setState(await api(`/api/games/${session.id}`));}
    catch(e){app.innerHTML=`<section class="empty"><p class="eyebrow">THE VILLAGE IS OUT OF REACH</p><h1>暫時未能連上村莊。</h1><p class="muted">${escape(e.message)}</p><button class="primary" id="retry">重新連線</button><p><a href="/">返回首頁</a></p></section>`;bilingualize(app);$('#retry').onclick=boot;}
  }else setup();
}
setInterval(()=>{if(!playerPage && session && !document.hidden && !busy && !privateDialog.open)refresh();},3000);
setInterval(()=>{if(!document.hidden)claimSpeaker();},5000);
window.addEventListener('hashchange',()=>{closePrivate();narrator.stop();state=null;const hash=new URLSearchParams(location.hash.slice(1));if(playerPage||hash.has('join')||hash.has('player'))location.reload();else boot();});
$('#guide-privacy').innerHTML=privacyReminder();
bilingualize(document.body);
boot();
