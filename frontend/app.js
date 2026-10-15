import {Narrator} from './audio.mjs';
import {themeForPhase} from './presentation.mjs';
const $ = (q, root = document) => root.querySelector(q);
const app = $('#app');
const privateDialog = $('#private-dialog');
const labels = {wolf:'狼人',seer:'預言家',witch:'女巫',hunter:'獵人',villager:'平民'};
const symbols = Object.fromEntries(Object.keys(labels).map(role=>[role,`<svg viewBox="0 0 48 48" aria-hidden="true"><use href="/assets/roles.svg#${role}"></use></svg>`]));
const names = {reveal:'身份交接',wolves:'狼人行動',witch:'女巫行動',seer:'預言家查驗',dawn:'等待天亮',hunter:'獵人的最後一槍',discussion:'白天討論',vote:'村莊公投',runoff:'平票加賽',finished:'月落，真相浮現'};
const descriptions = {reveal:'請將裝置交給指定座位。只有本人可以打開身份卡，確認後立即收起。',wolves:'所有人閉眼。只有狼人可以查看私人畫面，並共同選擇今晚的目標。',witch:'狼人閉眼，女巫睜眼。請女巫私下決定是否使用藥物。',seer:'女巫閉眼，預言家睜眼。查驗結果只會在私人畫面顯示。',dawn:'所有夜間行動已鎖定。確認大家睜眼後，公布昨晚的結果。',hunter:'勝負尚未結算。獵人可以帶走一位存活玩家，或放棄開槍。',discussion:'每個聲音都可能藏著線索。依座位發言，仔細聆聽，再作判斷。',vote:'依次記錄每位存活玩家的選擇。可以棄權，也可以投自己。',runoff:'只在平票玩家之間再投一次。若仍平票，今晚無人出局。',finished:'所有秘密已經揭曉。回看每個座位的身份，拼出這一夜的故事。'};
const causes = {wolf:'夜晚出局',poison:'被毒殺',vote:'公投出局',hunter:'被獵人帶走'};
const presets = {6:{wolf:2,seer:1,witch:1,hunter:0,villager:2},9:{wolf:3,seer:1,witch:1,hunter:1,villager:3},12:{wolf:4,seer:1,witch:1,hunter:1,villager:5}};
let counts = {...presets[9]}, state = null, session = null, busy = false, voice = false, pollBusy = false;
let timerInterval, toastTimeout;
let debugEnabled = sessionStorage.getItem('moonfall-debug') === 'true';
let debugRequest = 0;
let voiceProfile = sessionStorage.getItem('moonfall-voice') || 'original';
if(!['original','narrator'].includes(voiceProfile)) voiceProfile='original';
let allowFallback = sessionStorage.getItem('moonfall-voice-fallback') === 'true';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = {lobby:'#0b1113',day:'#edf3eb',night:'#0a1116'}[theme];
}
function updateDebugButton() {
  $('#debug').hidden = !!session?.viewer;
  $('#debug').textContent = debugEnabled ? 'DEBUG on' : 'DEBUG off';
  $('#debug').setAttribute('aria-pressed', String(debugEnabled));
}
async function loadDebug() {
  const request = ++debugRequest;
  const slot = $('#debug-panel');
  if (!debugEnabled || session?.viewer || !slot) return;
  slot.innerHTML = '<p class="muted">正在載入主持人身份表…</p>';
  try {
    const info = await api(`/api/games/${session.id}/debug`);
    if (request !== debugRequest || !debugEnabled || session?.viewer || !$('#debug-panel')) return;
    if (info.version !== state.version) { await refresh(); return; }
    slot.innerHTML = `<div class="debug-heading"><span class="eyebrow">DEBUG · 主持人專用</span><span class="muted">${escape(info.phase)} / v${info.version}</span></div><div class="debug-roster">${info.players.map(p=>`<div><strong>${p.seat} 號 · ${labels[p.role]}</strong><span>${p.alive?'存活':causes[p.cause]}</span></div>`).join('')}</div><p class="muted">解藥：${info.potions.save_used?'已使用':'未使用'} · 毒藥：${info.potions.poison_used?'已使用':'未使用'}<br>本晚狼刀：${info.night.kill??'無'} · 毒藥目標：${info.night.poison??'無'}${info.night.inspection?` · 查驗：${info.night.inspection.seat} 號（${info.night.inspection.alignment==='wolf'?'狼人':'好人'}）`:''}</p>`;
  } catch(error) {
    if(request === debugRequest && $('#debug-panel')) {
      const message = error.status === 404 ? 'DEBUG 尚未載入：伺服器可能仍在執行舊版本。請重新啟動 Python 伺服器，再重試。' : error.message;
      slot.innerHTML = `<p class="dialog-error">${escape(message)}</p><button class="icon-button" id="retry-debug">重試 DEBUG</button>`;
      $('#retry-debug').onclick = loadDebug;
    }
  }
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 5000); }

const narrator = new Narrator({context:()=>({enabled:voice,state,session,profile:voiceProfile,allowFallback}),status:text=>{const el=$('#voice-status');if(el)el.textContent=text;}});
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
function closePrivate() { privateDialog.close(); privateDialog.replaceChildren(); }
function setState(next) {
  const changed = !state || state.phase !== next.phase || state.day !== next.day;
  state = next; renderGame(); loadDebug(); if (changed) narrator.speak();
}
async function action(name, data = {}) {
  if (busy) return;
  busy = true; narrator.stop(); closePrivate();
  app.setAttribute('aria-busy','true'); app.querySelectorAll('button').forEach(b => b.disabled = true);
  try { setState(await api(`/api/games/${session.id}/actions`, {method:'POST',body:JSON.stringify({version:state.version,action:name,data})})); }
  catch (e) { toast(e.message); await refresh(); }
  finally { busy = false; app.removeAttribute('aria-busy'); app.querySelectorAll('button').forEach(b => b.disabled = false); }
}
async function refresh() {
  if (!session || pollBusy) return;
  pollBusy = true;
  try {
    const next = await api(`/api/games/${session.id}`);
    if (!state || next.version !== state.version) { closePrivate(); setState(next); }
  } catch (e) { toast(e.message); }
  finally { pollBusy = false; }
}
function setup() {
  clearInterval(timerInterval);
  applyTheme('lobby'); updateDebugButton(); ++debugRequest;
  app.innerHTML = `<section class="hero"><div class="hero-content"><p class="eyebrow">A SOCIAL DEDUCTION RITUAL</p><h1>When the moon rises,<br><em>trust no one.</em></h1><p class="zh">天黑請閉眼，故事即將開始。</p><p class="lede">Gather your friends. Keep your secrets.<br>Your Cantonese game master takes care of the night.</p><span class="hero-chip"><i></i> 5–16 PLAYERS <span> / </span> ONE SHARED NIGHT</span></div><span class="hero-mark">Somewhere in the village, a wolf is waiting.</span></section>
  <div class="section-heading"><div><h2><span class="number">01 /</span> Assemble the village <span class="muted">集結村莊</span></h2><p>Choose your cast. Every seat has a secret to keep.</p></div><div class="presets">${[6,9,12].map(n=>`<button class="preset ${JSON.stringify(counts)===JSON.stringify(presets[n])?'active':''}" data-preset="${n}">${n} 人局</button>`).join('')}</div></div>
  <div class="setup-grid"><section><div class="role-grid">${Object.keys(labels).map(r=>`<article class="role-card"><span class="role-icon" aria-hidden="true">${symbols[r]}</span><h3>${labels[r]}</h3><small>${r}</small><div class="stepper"><button data-role="${r}" data-delta="-1" aria-label="減少${labels[r]}">−</button><output aria-label="${labels[r]}人數">${counts[r]}</output><button data-role="${r}" data-delta="1" aria-label="增加${labels[r]}">+</button></div></article>`).join('')}</div><div class="setup-note"><span>☾</span><span>身份由系統隨機分配，每人私下查看自己的身份。<br>一部裝置，主持全場。另設安全的觀眾畫面。</span></div><div class="steps"><div class="step"><span class="n">I.</span><div><strong>Take your seat · 入座</strong><p>設定角色，集結你的村莊。</p></div></div><div class="step"><span class="n">II.</span><div><strong>Keep your secret · 守密</strong><p>輪流揭開只屬於你的身份。</p></div></div><div class="step"><span class="n">III.</span><div><strong>Survive the night · 生存</strong><p>跟隨語音，尋找藏身的狼人。</p></div></div></div></section>
  <aside class="panel"><p class="eyebrow">YOUR TABLE, YOUR RULES</p><h3>今晚的約定</h3><p class="muted">Settle the rules before the first night.</p><label class="rule-line">女巫可以自救<input id="self-save" type="checkbox"></label><label class="rule-line">女巫被刀當晚可行動<input id="witch-acts" type="checkbox" checked></label><label class="rule-line">狼人達到平票人數即勝<input id="parity" type="checkbox" checked></label><label class="rule-line">討論時間（秒）<input id="duration" type="number" min="15" max="600" value="90"></label><button class="primary start-button" id="create"><span>Begin the night · 開始遊戲</span><span>↗</span></button><p class="fineprint"><span id="total">${Object.values(counts).reduce((a,b)=>a+b,0)}</span> players at the table · 自動儲存進度</p><p id="setup-error" class="action-error" role="alert"></p></aside></div>`;
  app.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{counts={...presets[b.dataset.preset]}; preserveRules(setup);});
  app.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{const r=b.dataset.role;counts[r]=Math.min(['wolf','villager'].includes(r)?12:1,Math.max(0,counts[r]+Number(b.dataset.delta)));preserveRules(setup);});
  $('#create').onclick = createGame;
  try {
    const saved=JSON.parse(sessionStorage.getItem('moonfall-session'));
    if(saved?.id){
      const resume=document.createElement('button');resume.className='secondary new-session';resume.textContent='↩ 繼續目前遊戲 · Resume your village';
      resume.onclick=()=>{session=saved;history.replaceState(null,'',`/#game=${session.id}`);refresh();};app.querySelector('.hero').after(resume);
    }
  }catch{}
}
function preserveRules(render) {
  const values = ['self-save','witch-acts','parity','duration'].map(id=>[id,$('#'+id).type==='checkbox'?$('#'+id).checked:$('#'+id).value]);
  render(); values.forEach(([id,v])=>{if($('#'+id).type==='checkbox')$('#'+id).checked=v;else $('#'+id).value=v;});
}
async function createGame() {
  if (busy) return;
  busy = true; $('#create').disabled = true;
  const rules = {witch_self_save:$('#self-save').checked,witch_acts_when_killed:$('#witch-acts').checked,parity_wins:$('#parity').checked,discussion_seconds:Number($('#duration').value)};
  try {
    const result = await api('/api/games',{method:'POST',body:JSON.stringify({counts,rules})});
    session = {id:result.id,token:result.host_token,viewerToken:result.viewer_token,viewer:false};
    sessionStorage.setItem('moonfall-session',JSON.stringify(session));
    history.replaceState(null,'',`/#game=${session.id}`); setState(result.state);
  } catch(e) { $('#setup-error').textContent=e.message; $('#create').disabled=false; }
  finally { busy=false; }
}
function renderGame() {
  clearInterval(timerInterval);
  const p = state.phase, night = themeForPhase(p) === 'night';
  const debug = debugEnabled && !session.viewer;
  applyTheme(themeForPhase(p)); updateDebugButton();
  const stages = [['reveal','身份'],['wolves','狼人'],['witch','女巫'],['seer','預言家'],['dawn','天亮'],['discussion','討論'],['vote','投票']];
  const actualStage = p==='runoff'?'vote':p==='hunter'?'dawn':p;
  const living = state.players.filter(p=>p.alive).length;
  app.innerHTML = `<div class="session-header"><div><p class="eyebrow">${session.viewer?'THE VILLAGE VIEW':'THE GAME MASTER’S TABLE'}</p><h1>村莊紀事 <span class="muted">/ 第 ${state.day} ${night?'晚':'輪'}</span></h1></div><div class="session-tools">${!session.viewer?'<button class="icon-button" id="audience">↗ 觀眾畫面</button><button class="icon-button" id="new-game">＋ 新遊戲</button>':'<span class="status-pill">READ ONLY · 觀眾</span>'}</div></div>
  ${p==='finished'?`<div class="winner-banner"><p class="eyebrow">THE TRUTH, AT LAST</p><h2>${{village:'好人陣營勝利',wolves:'狼人陣營勝利',draw:'雙方全滅 · 平局'}[state.winner]}</h2><p>月落之後，每個秘密都有了答案。完整身份與死亡原因已公開。</p></div>`:`<div class="progress">${stages.map(([key,text])=>`<span class="${key===actualStage?'current':''}">${text}</span>`).join('')}</div>`}
  ${session.viewer?'<div class="viewer-note">這是公開觀眾畫面。私人行動與查驗結果不會出現在這裡。每 3 秒同步。</div>':''}
  <div class="game-hero"><span>${night?'The woods are quiet. Too quiet.':'A new light. The same secrets.'}</span><small>${night?'血月之下，請閉上眼睛。':'晨光已至，請睜開眼睛。'}</small></div>
  ${debug?'<section id="debug-panel" class="debug-panel" aria-label="DEBUG 主持人身份表"></section>':''}
  <div class="game-grid"><section><div class="table-panel"><div class="table-top"><p class="eyebrow">THE VILLAGE <span class="muted">/ 座位</span></p><span class="live-count"><i></i>${living} / ${state.players.length} 存活</span></div><div class="village">${state.players.map(pl=>`<article class="seat ${!pl.alive?'dead':''} ${pl.role==='wolf'?'revealed-wolf':''}"><div class="avatar">${p==='finished'?symbols[pl.role]:'♙'}</div><strong>SEAT ${String(pl.seat).padStart(2,'0')} · ${pl.seat} 號</strong><small>${p==='finished'?labels[pl.role]+' · '+(pl.alive?'存活':causes[pl.cause]):pl.alive?'身份未公開':'已出局'}</small></article>`).join('')}</div></div>
  <div class="narration"><span class="sigil">◖</span><div><span class="micro">THE NARRATOR · 語音主持</span><p>${escape(state.narration)}</p><div class="voice-settings"><label for="voice-profile">聲線</label><select id="voice-profile"><option value="original">原版廣東話女聲</option><option value="narrator">廣東話男聲（較慢）</option></select><label class="voice-fallback"><input id="voice-fallback" type="checkbox">允許本機備用語音（較機械）</label></div><small id="voice-status">${voice?'語音已啟用':'語音關閉 · 可按右上角啟用'}</small></div></div>
  <section class="chronicle"><h3>Day & night chronicle <span class="muted">日夜紀錄</span></h3>${[...state.events].reverse().map(e=>`<div class="event"><time>ROUND ${String(e.day).padStart(2,'0')}</time><span>${escape(e.text)}</span></div>`).join('')}</section></section>
  <aside class="panel stage-panel"><p class="eyebrow">${p==='finished'?'THE EPILOGUE':night?'THE NIGHT RITUAL':'THE NEXT CHAPTER'}</p><div class="phase-symbol" aria-hidden="true">${({reveal:'✧',wolves:'☾',witch:'⚗',seer:'✧',dawn:'☼',hunter:'⌖',discussion:'☼',vote:'⚖',runoff:'⚖',finished:'☾'})[p]}</div><h2>${names[p]}</h2><p class="muted">${descriptions[p]}</p>${p==='reveal'?`<p class="notice">現在輪到 ${state.reveal_seat} 號玩家。其他人請移開視線。</p>`:''}${p==='hunter'?`<p class="notice">獵人：${state.hunter} 號</p>`:''}${p==='runoff'?`<p class="notice">平票座位：${state.runoff.join('、')} 號</p>`:''}
  ${p==='discussion'?(debug?'<p class="notice">DEBUG：略過討論倒數，可直接進入投票。</p>':'<div class="timer" id="timer">01:30</div><div class="timer-controls"><button class="icon-button" id="timer-toggle">開始計時</button><button class="icon-button" id="timer-reset">重設</button></div>'):''}
  ${!session.viewer && p!=='finished'?`<button class="primary" id="stage-action">${({reveal:'私下查看身份 ↗',wolves:'狼人私人行動 ↗',witch:'女巫私人行動 ↗',seer:'預言家私人行動 ↗',dawn:'公布昨晚結果 →',hunter:'決定最後一槍 ↗',discussion:'開始投票 →',vote:'記錄全體投票 ↗',runoff:'記錄加賽投票 ↗'})[p]}</button>`:''}
  ${session.viewer?'<p class="notice">等待主持人推進遊戲。</p>':'<p class="fineprint">私人畫面不會讀出秘密。<br>切換分頁時會自動遮蔽。</p>'}<button class="secondary" id="replay">↻ 重播公開旁白</button></aside></div>`;
  $('#stage-action')?.addEventListener('click',()=>{if(p==='dawn')action('dawn');else if(p==='discussion')action('vote');else if(['vote','runoff'].includes(p))openBallots();else openPrivate();});
  if(p==='reveal' && debug) {
    const skip = document.createElement('button');
    skip.id = 'skip-reveal'; skip.className = 'secondary';
    skip.textContent = '跳過身份交接（DEBUG） →';
    skip.onclick = () => action('debug_skip_reveal');
    $('#stage-action').after(skip);
  }
  $('#voice-profile').value=voiceProfile;
  $('#voice-fallback').checked=allowFallback;
  $('#voice-profile').onchange=()=>{voiceProfile=$('#voice-profile').value;sessionStorage.setItem('moonfall-voice',voiceProfile);narrator.stop();if(voice)narrator.speak();};
  $('#voice-fallback').onchange=()=>{allowFallback=$('#voice-fallback').checked;sessionStorage.setItem('moonfall-voice-fallback',String(allowFallback));narrator.stop();if(voice)narrator.speak();};
  $('#replay').onclick=()=>{voice=true;updateVoice();narrator.speak();};
  $('#audience')?.addEventListener('click',()=>{
    const url=`${location.origin}/#watch=${session.id}&key=${session.viewerToken}`;
    privateDialog.innerHTML=`<p class="eyebrow">THE VILLAGE VIEW</p><h2>讓大家看見村莊。</h2><p>這個連結只顯示公開資訊。請在另一個視窗打開，或複製給觀眾。另一部裝置需要可連線的伺服器網址。</p><label class="muted" for="viewer-url">觀眾專用連結</label><input class="share-url" id="viewer-url" readonly value="${escape(url)}"><div class="button-row"><button class="secondary" id="copy-viewer">複製連結</button><a class="primary share-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">另開觀眾畫面 ↗</a></div><p><a class="muted" href="${escape(url)}">在此分頁預覽 →</a></p><button class="icon-button" id="close-share">返回主持畫面</button>`;
    privateDialog.showModal();$('#close-share').onclick=closePrivate;
    $('#copy-viewer').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('觀眾連結已複製。');}catch{$('#viewer-url').select();toast('請手動複製已選取的連結。');}};
  });
  $('#new-game')?.addEventListener('click',()=>{
    privateDialog.innerHTML='<p class="eyebrow">ANOTHER NIGHT</p><h2>開一局新遊戲？</h2><p>目前遊戲會保留在伺服器，但這個分頁將開始新局。要保留舊局的操作權，請先保留目前分頁。</p><div class="button-row"><button class="secondary" id="cancel-new">繼續本局</button><button class="primary" id="confirm-new">開新局</button></div>';
    privateDialog.showModal();$('#cancel-new').onclick=closePrivate;$('#confirm-new').onclick=()=>{closePrivate();narrator.stop();session=null;state=null;sessionStorage.removeItem('moonfall-session');history.replaceState(null,'','/');setup();};
  });
  if(p==='discussion' && !debug) initTimer();
  if(p==='discussion' && debug) $('#stage-action').textContent = '跳過討論（DEBUG） →';
}
function targetChoices(seats, optional=true) {
  return `<div class="target-grid">${seats.map(s=>`<label><input type="radio" name="target" value="${s}" ${!optional?'required':''}><span>${s} 號</span></label>`).join('')}${optional?'<label class="pass"><input type="radio" name="target" value="" checked><span>不選擇目標 / 放棄</span></label>':''}</div>`;
}
function chosen(form) { const raw=new FormData(form).get('target'); return raw ? Number(raw) : null; }
async function openPrivate() {
  if (busy) return;
  narrator.stop();
  privateDialog.innerHTML=`<p class="eyebrow">PRIVATE HANDOFF · 私人交接</p><h2>確認只有${state.phase==='reveal'?`${state.reveal_seat} 號玩家`:state.phase==='hunter'?`${state.hunter} 號獵人`:names[state.phase].replace('行動','').replace('查驗','')}在看畫面。</h2><p>請先讓其他人移開視線，再揭開私人資訊。</p><button class="primary" id="uncover">我已準備好 · 揭開</button><button class="secondary new-session" id="cover">返回公開畫面</button>`;
  privateDialog.showModal(); $('#cover').onclick=closePrivate;
  $('#uncover').onclick=async()=>{
    $('#uncover').disabled=true;
    try { const info=await api(`/api/games/${session.id}/private`); if(privateDialog.open)renderPrivate(info); }
    catch(e){closePrivate();toast(e.message);}
  };
}
function renderPrivate(info) {
  const phase=state.phase;
  let content='';
  if(phase==='reveal') content=`<p class="private-seat">SEAT ${String(info.seat).padStart(2,'0')} · ${info.seat} 號</p><div class="private-icon">${symbols[info.role]}</div><div class="private-role">${labels[info.role]}</div><p class="private-seat">${info.role==='wolf'?'你藏身於村莊之中。與同伴一起活到最後。':'守護村莊，找出藏在你們之間的狼人。'}</p><button class="primary" id="ack">記住了 · 收起並交給下一位</button>`;
  if(phase==='wolves') content=`<h2>今晚，誰將消失？</h2><p>你的狼人同伴：${info.wolves.join('、')} 號。可以空刀，亦可選狼人。</p><form id="private-form">${targetChoices(info.targets)}<button class="primary">鎖定目標 · 收起畫面</button></form>`;
  if(phase==='witch') content=`<h2>一瓶藥，一個決定。</h2>${info.active?`<p class="notice">${info.kill?`今晚被刀：${info.kill} 號`:'今晚沒有狼人擊殺目標。'}</p><p>每晚最多用一瓶。解藥只能救狼人目標；毒藥可選任意存活玩家。</p>`:'<p class="notice">本晚沒有可行動的女巫，請維持相同交接流程。</p>'}<form id="private-form">${info.can_save?'<label class="check-label"><input type="checkbox" name="save">使用解藥，救回今晚被刀玩家</label>':'<p class="muted">本晚解藥不可用。</p>'}${info.can_poison?`<p class="micro">毒藥目標（可放棄）</p>${targetChoices(info.targets)}`:'<p class="muted">本晚毒藥不可用。</p>'}<p class="dialog-error" id="private-error" role="alert"></p><button class="primary">確認用藥決定 · 收起畫面</button></form>`;
  if(phase==='seer') {
    if(!info.active) content='<h2>今晚沒有可行動的預言家。</h2><p>請維持相同交接流程，確認後關閉私人畫面。</p><button class="primary" id="ack">確認 · 收起畫面</button>';
    else if(info.inspection) content=`<h2>迷霧之後的真相。</h2><p class="private-seat">你查驗了 ${info.inspection.seat} 號</p><div class="private-role">${info.inspection.alignment==='wolf'?'狼人':'好人'}</div><p class="notice">請記住結果。確認後即清除畫面。</p><button class="primary" id="ack">確認結果 · 收起畫面</button>`;
    else content=`<h2>你想看穿誰？</h2><p>選一位其他存活玩家。結果只會告訴你陣營。</p><form id="private-form">${targetChoices(info.targets,false)}<button class="primary">查驗身份</button></form>`;
  }
  if(phase==='hunter') content=`<h2>獵人 ${state.hunter} 號的最後一槍。</h2><p>你可以帶走一位存活玩家，或放棄開槍。</p><form id="private-form">${targetChoices(info.targets)}<button class="danger">確認最後決定</button></form>`;
  privateDialog.innerHTML=`<p class="eyebrow">FOR YOUR EYES ONLY · 只供目前角色</p>${content}<button class="icon-button new-session" id="mask">返回</button>`;
  $('#mask').onclick=closePrivate;
  $('#ack')?.addEventListener('click',()=>action('ack'));
  $('#private-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const form=e.currentTarget, seat=chosen(form);
    if(phase==='witch') {
      const save=new FormData(form).get('save')==='on';
      if(save && seat!==null){$('#private-error').textContent='每晚只可使用一瓶藥。請取消解藥或毒藥目標。';return;}
      action('witch',{save,poison:seat});
    } else if(phase==='seer') {
      if(busy)return;busy=true;form.querySelector('button').disabled=true;
      try {
        state=await api(`/api/games/${session.id}/actions`,{method:'POST',body:JSON.stringify({version:state.version,action:'inspect',data:{target:seat}})});
        const fresh=await api(`/api/games/${session.id}/private`);
        if(privateDialog.open)renderPrivate(fresh);
      }catch(error){closePrivate();toast(error.message);await refresh();}
      finally{busy=false;}
    } else action(phase==='wolves'?'wolves':'shoot',{target:seat});
  });
}
function openBallots() {
  const living=state.players.filter(p=>p.alive).map(p=>p.seat);
  privateDialog.innerHTML=`<p class="eyebrow">THE VILLAGE DECIDES</p><h2>${state.phase==='runoff'?'平票加賽':'記錄全體投票'}</h2><p>先核對每人的選擇，再一次提交。空白代表棄權。</p><form id="ballot-form"><div class="ballot-list">${living.map(s=>`<label class="ballot-row"><span>${s} 號玩家投給</span><select name="${s}"><option value="">棄權</option>${(state.phase==='runoff'?state.runoff:living).map(n=>`<option value="${n}">${n} 號</option>`).join('')}</select></label>`).join('')}</div><div class="button-row"><button class="secondary" type="button" id="cancel-ballot">返回</button><button class="primary">確認全體投票</button></div></form>`;
  privateDialog.showModal();$('#cancel-ballot').onclick=closePrivate;
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
    $('#timer-toggle').textContent=timer.deadline?'暫停計時':'開始計時';
    if(timer.deadline && remaining===0){timer={remaining:0,deadline:null};save();$('#timer-toggle').textContent='時間到';toast('討論時間到。請主持人開始投票。');}
  };
  $('#timer-toggle').onclick=()=>{if(timer.deadline){timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));timer.deadline=null;}else if(timer.remaining>0)timer.deadline=Date.now()+timer.remaining*1000;save();update();};
  $('#timer-reset').onclick=()=>{timer={remaining:state.rules.discussion_seconds,deadline:null};save();update();};
  update();timerInterval=setInterval(update,250);
}
function updateVoice() { $('#sound').textContent=voice?'◖ Voice on':'◖ Voice off';$('#sound').setAttribute('aria-pressed',String(voice)); }
$('#sound').onclick=()=>{voice=!voice;updateVoice();if(voice)narrator.speak();else{narrator.stop();narrator.status('語音關閉 · 字幕仍然顯示');}};
$('#help').onclick=()=>$('#help-dialog').showModal();
$('#debug').onclick=()=>{
  if(session?.viewer || busy) return;
  debugEnabled=!debugEnabled; ++debugRequest;
  sessionStorage.setItem('moonfall-debug',String(debugEnabled));
  updateDebugButton();
  if(state){renderGame();loadDebug();}
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
privateDialog.addEventListener('cancel',()=>{privateDialog.replaceChildren();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){closePrivate();narrator.stop();}else if(session)refresh();});
window.addEventListener('pagehide',()=>narrator.dispose());
async function boot() {
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('watch') && hash.has('key')) {
    session={id:hash.get('watch'),token:hash.get('key'),viewer:true};
    sessionStorage.setItem('moonfall-viewer',JSON.stringify(session));
    history.replaceState(null,'',`/#watch=${session.id}`);
  } else {
    try {session=JSON.parse(sessionStorage.getItem(hash.has('watch')?'moonfall-viewer':'moonfall-session'));}catch{}
    if(session && (hash.get('watch')||hash.get('game'))!==session.id)session=null;
  }
  if(session){
    try{setState(await api(`/api/games/${session.id}`));}
    catch(e){app.innerHTML=`<section class="empty"><p class="eyebrow">THE VILLAGE IS OUT OF REACH</p><h1>暫時未能連上村莊。</h1><p class="muted">${escape(e.message)}</p><button class="primary" id="retry">重新連線</button><p><a href="/">返回首頁</a></p></section>`;$('#retry').onclick=boot;}
  }else setup();
}
setInterval(()=>{if(session && !document.hidden && !busy && !privateDialog.open)refresh();},3000);
window.addEventListener('hashchange',()=>{closePrivate();narrator.stop();state=null;boot();});
boot();
