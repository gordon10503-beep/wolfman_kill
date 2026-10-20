import {roleCard} from './role-cards.mjs';
import {roleTip, roleEffect} from './role-effects.mjs';
import {bilingualize,setBilingualText} from './bilingual.mjs';
import {themeForPhase,englishSeatText,chineseSeatText,narrationChanged} from './presentation.mjs';
import {wolfSweep, skySweep, shouldSweep, skyChange} from './transitions.mjs';
import {Narrator} from './audio.mjs';
import {RoomChat} from './chat.mjs';
import {actionLabel,hasPlayerAction,voiceVolume,bindVolume,voteRecords} from './session-ui.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sub=(zh,en)=>`${zh}<span class="english-subtext" lang="en">${en}</span>`;

export class RoomHost {
  constructor({api,session,refresh,dialog}) {Object.assign(this,{api,session,refresh,dialog});}
  async open() {
    const s=this.session();
    this.dialog.innerHTML=`<button class="close" id="room-close" aria-label="關閉 / Close">×</button><p class="eyebrow">ONE VILLAGE · MANY SCREENS</p><h2>${sub('房間與裝置','Room & devices')}</h2><div class="room-mode"><button class="secondary" id="mode-single">單機交接 · Single device</button><button class="secondary" id="mode-multi">同場各用手機 · In-person phones</button><button class="secondary" id="mode-remote">遠端遊戲 · Remote play</button></div><p class="room-warning">${sub('切換模式保留身份、藥水及進度；尚未結算的手機投票／狼刀選擇會清空。','Switching keeps roles, potions and progress. Unresolved phone ballots and wolf choices are cleared.')}</p><div id="room-share"></div><p class="room-status" id="room-summary"></p><div id="room-members" class="room-members"></div><p class="room-error" id="room-error" role="alert"></p>`;
    this.dialog.showModal();
    this.dialog.querySelector('#room-close').onclick=()=>{this.dialog.close();clearInterval(this.timer);};
    for(const mode of ['single','multi','remote'])this.dialog.querySelector(`#mode-${mode}`).onclick=()=>this.command('mode',{mode});
    this.signature=null;
    await this.sync();
    if(!s.invite){await this.newInvite();}else this.showInvite();
    clearInterval(this.timer);this.timer=setInterval(()=>{if(this.dialog.open && !document.hidden)this.sync();else if(!this.dialog.open)clearInterval(this.timer);},3000);
  }
  async command(command,data={}) {
    try {await this.api(`/api/games/${this.session().id}/room`,{method:'POST',body:JSON.stringify({command,data})});await this.sync();await this.refresh();}
    catch(e){this.dialog.querySelector('#room-error').textContent=e.message;}
  }
  async newInvite() {
    try {
      const result=await this.api(`/api/games/${this.session().id}/room`,{method:'POST',body:JSON.stringify({command:'invite'})});
      this.session().invite=result.invite;
      this.session().seats=result.seats;
      this.session().hostSeat=result.host_seat;
      sessionStorage.setItem('moonfall-session',JSON.stringify(this.session()));this.showInvite();await this.refresh();
    }catch(e){this.dialog.querySelector('#room-error').textContent=e.message;}
  }
  showInvite() {
    const url=`${location.origin}/#join=${this.session().id}&invite=${this.session().invite}&seats=${this.session().seats||16}&hostseat=${this.session().hostSeat||1}`;
    this.dialog.querySelector('#room-share').innerHTML=`<label for="room-link">${sub('分享房間連結','Share the room link')}</label><input class="share-url" id="room-link" readonly value="${esc(url)}"><div class="button-row"><button class="secondary" id="room-copy">複製 · Copy</button><button class="secondary" id="room-rotate">更新邀請 · Renew invite</button></div><p class="room-status">${sub('主持人已自動入座，可分別查看身份及使用目前階段的行動按鈕，無須另外加入或切換分頁。','The host is seated automatically. Use the separate identity and current-action buttons; no separate join or player tab is needed.')}</p><p class="room-status">${sub('座位自動分配後，由你核對稱呼並批准。不要分享主持人裝置。同場由主裝置旁白；遠端玩家各自播放。','Seats follow join order. Verify each name before approval. Keep the host device private. In-person play uses one narrator; remote players have their own audio controls.')}</p>`;
    this.dialog.querySelector('#room-copy').onclick=async()=>{try{await navigator.clipboard.writeText(url);this.dialog.querySelector('#room-copy').textContent='已複製 · Copied';}catch{this.dialog.querySelector('#room-link').select();}};
    this.dialog.querySelector('#room-rotate').onclick=()=>this.newInvite();
  }
  async sync() {
    try {
      const result=await this.api(`/api/games/${this.session().id}/room`);
      if(!this.dialog.open)return;
      this.dialog.querySelector('#room-summary').textContent=`${result.room.remote?'遠端遊戲 · Remote play':result.room.mode==='multi'?'同場各用手機 · In-person phones':'單機交接 · Single device'} · ${result.room.connected} 位已批准 / approved`;
      for(const mode of ['single','multi','remote'])this.dialog.querySelector(`#mode-${mode}`).setAttribute('aria-pressed',String((result.room.remote?'remote':result.room.mode)===mode));
      const signature=JSON.stringify(result.members);if(signature===this.signature)return;this.signature=signature;
      this.dialog.querySelector('#room-members').innerHTML=result.members.length?result.members.map(m=>`<div class="room-member"><span>${sub(`${m.seat} 號 · ${esc(m.name)||'玩家'}`,`Seat ${m.seat} · ${m.approved?'Approved':'Awaiting approval'}`)}</span><div>${!m.approved?`<button class="icon-button" data-approve="${esc(m.id)}">批准 · Approve</button>`:''}${m.host?'<span class="status-pill">主持人 · HOST</span>':`<button class="icon-button" data-revoke="${esc(m.id)}">${m.approved?'撤銷 · Revoke':'拒絕 · Reject'}</button>`}</div></div>`).join(''):`<p class="room-status">${sub('主持人已自動入座，等待其他玩家加入。','The host is seated automatically. Waiting for other players.')}</p>`;
      this.dialog.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>this.command('approve',{id:b.dataset.approve}));
      this.dialog.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>this.command('revoke',{id:b.dataset.revoke}));
    }catch(e){if(this.dialog.open)this.dialog.querySelector('#room-error').textContent=e.message;}
  }
}

export async function startPlayer(hash) {
  const app=document.querySelector('#app'),dialog=document.querySelector('#private-dialog');
  let id=hash.get('join')||hash.get('player'),credential=null,current=null,busy=false,polling=false,privateKey=null;
  const storageKey=`moonfall-player-${id}`;
  document.documentElement.dataset.theme='lobby';
  try{credential=JSON.parse(localStorage.getItem(storageKey));}catch{}
  for(const selector of ['#debug','#sound','#session-tools','#archive','#volume-control'])document.querySelector(selector).hidden=true;
  document.querySelector('.local-badge').textContent='玩家裝置 · PLAYER DEVICE';
  const close=()=>{dialog.getAnimations({subtree:true}).forEach(a=>a.cancel());dialog.close();dialog.replaceChildren();privateKey=null;};
  const request=async(path,body)=>{
    const response=await fetch(`/api/games/${id}/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential.token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok){const error=new Error(typeof result.detail==='string'?result.detail:'請重試 / Please retry');error.status=response.status;throw error;}return result;
  };
  let voice=sessionStorage.getItem('moonfall-player-voice')!=='false',language=sessionStorage.getItem('moonfall-speech-language')==='en'?'en':'yue',audioStatus='語音已啟用 · Voice enabled';
  const narrator=new Narrator({context:()=>({enabled:voice&&!!current?.approved&&!!current?.state?.room?.remote&&!document.hidden,state:current?.state,session:credential?{id,token:credential.token}:null,profile:language==='en'?'narrator':'original',language,volume:voiceVolume(),allowFallback:false}),status:text=>{audioStatus=text;const el=document.querySelector('#player-voice-status');if(el)setBilingualText(el,text);}});
  bindVolume(narrator);
  const chat=new RoomChat({context:()=>({id,enabled:!!current?.state?.room?.remote,phase:current?.state?.phase}),request:(suffix,body)=>request('chat'+suffix,body)});
  function updateSound(){const button=document.querySelector('#sound'),remote=!!current?.approved&&!!current?.state?.room?.remote;button.hidden=!remote;document.querySelector('#volume-control').hidden=!remote;button.textContent=voice?'◖ 語音開啟 · Voice on':'◖ 語音關閉 · Voice off';button.setAttribute('aria-pressed',String(voice));}
  document.querySelector('#sound').onclick=()=>{voice=!voice;sessionStorage.setItem('moonfall-player-voice',String(voice));updateSound();if(voice)narrator.speak();else narrator.stop();};
  function announce(previous){if(!current?.state?.room?.remote){narrator.stop();return;}if(!previous?.room?.remote||narrationChanged(previous,current.state))narrator.speak();}
  function audioMarkup(){return `<div class="player-audio-settings"><label for="player-language">語音語言 · Speech language</label><select id="player-language"><option value="yue">廣東話 Cantonese</option><option value="en">English 英語</option></select><button class="icon-button" id="player-replay">↻ 重播旁白 · Replay narration</button><small id="player-voice-status">${esc(audioStatus)}</small></div>`;}
  function error(e){const el=document.querySelector('#player-error');if(el)el.textContent=e.message;}
  async function joinForm() {
    document.documentElement.dataset.theme='lobby';
    app.innerHTML=`<section class="room-join-intro"><div class="game-hero player-scenery"><span>A place among the trees.</span><small>走進村莊 · Enter the village</small></div><p class="eyebrow">YOUR OWN SECRET · YOUR OWN SCREEN</p><h1>${sub('加入村莊','Join the village')}</h1><p>${sub('座位按加入次序自動分配，主持人批准後即可查看身份。','Seats are assigned automatically in join order. The host approves you before your role is available.')}</p><form class="room-form" id="join-form"><label>${sub('你的稱呼','Your name')}<input name="name" maxlength="32" autocomplete="nickname" required></label><button class="primary">申請加入 · Request a seat</button></form><p class="room-error" id="player-error" role="alert"></p></section>`;
    document.querySelector('#join-form').onsubmit=async e=>{
      e.preventDefault();if(busy)return;busy=true;
      try {
        const form=new FormData(e.currentTarget),result=await request('join',{invite:hash.get('invite')||'',name:form.get('name')});
        credential={token:result.player_token,seat:result.seat};localStorage.setItem(storageKey,JSON.stringify(credential));
        history.replaceState(null,'',`/#player=${id}`);await sync();
      }catch(e){error(e);}finally{busy=false;}
    };
  }
  function render() {
    updateSound();
    if(!current.approved){narrator.stop();chat.mount(null);app.innerHTML=`<section class="player-wait"><div class="game-hero player-scenery"><span>The village is gathering.</span><small>等待其他玩家 · Waiting for the village</small></div><p class="eyebrow">THE DOOR IS NOT YET OPEN</p><h1>${sub(`${current.seat} 號，等待批准`,`Seat ${current.seat} · Waiting for approval`)}</h1><p>${sub('請讓主持人核對座位，批准後會自動同步。','Ask the host to verify your seat. This screen updates automatically.')}</p><p class="room-error" id="player-error" role="alert"></p></section>`;return;}
    const state=current.state,multi=state.room.mode==='multi';
    document.documentElement.dataset.theme=themeForPhase(state.phase);
    document.querySelector('meta[name="theme-color"]').content=themeForPhase(state.phase)==='day'?'#edf3eb':'#0a1116';
    app.innerHTML=`<div class="player-shell"><header class="player-heading"><p class="eyebrow">ONE VILLAGE · YOUR PRIVATE SCREEN</p><h1>${sub(`${current.seat} 號玩家`,`PLAYER ${current.seat}`)}</h1><p>${sub(`第 ${state.day} 輪 · ${state.narration}`,`Round ${state.day} · ${state.narration_en}`)}</p></header><div class="player-action">${multi?'<button class="secondary" id="player-role">查看身份 · View my role</button>':''}</div>${state.room.remote?audioMarkup():''}<div class="game-hero player-scenery"><span>${themeForPhase(state.phase)==='night'?'The woods are quiet. Too quiet.':'A new light. The same secrets.'}</span><small>${themeForPhase(state.phase)==='night'?'靜聽森林，守住秘密。 · Keep your secrets.':'晨光已至，故事繼續。 · A new chapter begins.'}</small></div><p class="notice">${sub(multi?(state.room.remote?'遠端模式：每人可播放旁白。只有自己可看私人畫面。':'跟隨主裝置旁白。只有自己可看私人畫面；切換分頁會自動遮蔽。'):'已改用單機交接，請在主裝置繼續。',multi?(state.room.remote?'Remote play: each device may narrate. Keep private screens to yourself.':'Follow the main device narration. Keep private screens to yourself. Switching tabs hides them.'):'Single-device mode is active. Continue on the main device.')}</p><section class="table-panel player-table"><div class="table-top"><p class="eyebrow">THE VILLAGE · 村莊座位</p><span class="live-count"><i></i>${state.players.filter(p=>p.alive).length} / ${state.players.length} 存活 · Alive</span></div><div class="village">${state.players.map(p=>`<article class="seat ${p.alive?'':'dead'} ${p.seat===current.seat?'my-seat':''}"><div class="avatar">${p.seat}</div><strong>SEAT ${String(p.seat).padStart(2,'0')} · ${p.seat} 號</strong><small>${p.seat===current.seat?'本人 · YOU':''}</small><small>${chineseSeatText(p,state.phase==='finished',state.events)}</small><small>${englishSeatText(p,state.phase==='finished',state.events)}</small></article>`).join('')}</div></section><section class="chronicle player-chronicle"><h3>日夜紀行<span class="english-subtext" lang="en">Day & night chronicle</span></h3>${[...state.events].reverse().map(e=>`<div class="event"><time>ROUND ${String(e.day).padStart(2,'0')}</time><span>${esc(e.text)}</span></div>`).join('')}</section><div class="player-action-bottom">${multi&&current.can_act&&hasPlayerAction(state.phase)?`<button class="primary" id="player-open">${actionLabel(state.phase)}</button>`:''}</div>${state.room.remote?'<section id="player-chat" class="room-chat"></section>':''}${state.phase==='finished'?`<div class="winner-banner"><h2>${sub(({village:'好人勝利',wolves:'狼人勝利',draw:'平局'})[state.winner],({village:'Good side wins',wolves:'Wolves win',draw:'Draw'})[state.winner])}</h2>${state.players.map(p=>roleCard(p.role,p.seat)).join('')}</div>`:''}<p class="room-status">${sub(state.room.remote?'遠端模式：自行調整語音及音量。投票可選自己或棄權。':'同場模式由主裝置旁白。投票可選自己或棄權。',state.room.remote?'Remote mode: control your own narration and volume. You may vote for yourself or abstain.':'In-person mode: the main device narrates. You may vote for yourself or abstain.')}</p><p class="room-error" id="player-error" role="alert"></p><button class="secondary" id="player-sync">重新同步 · Sync</button></div>`;
    document.querySelector('#player-open')?.addEventListener('click',()=>openPrivate(false));
    document.querySelector('#player-role')?.addEventListener('click',()=>openPrivate(true));
    const table=document.querySelector('.player-table'),record=document.querySelector('.player-chronicle');table.before(record);record.insertAdjacentHTML('afterend',voteRecords(state.vote_history));
    const chatRoot=document.querySelector('#player-chat');if(chatRoot)record.before(chatRoot);chat.mount(chatRoot);
    if(state.room.remote){const select=document.querySelector('#player-language');select.value=language;select.onchange=()=>{language=select.value;sessionStorage.setItem('moonfall-speech-language',language);if(voice)narrator.speak();};document.querySelector('#player-replay').onclick=()=>{voice=true;sessionStorage.setItem('moonfall-player-voice','true');updateSound();narrator.speak({replay:true});};}
    document.querySelector('#player-sync').onclick=()=>sync(true);
    bilingualize(app);
  }
  async function sync(force=false) {
    if(!credential||polling||document.hidden)return;polling=true;
    try {
      const next=await request('player');
      if(!current || force || (next.state?.version??next.version)!==(current.state?.version??current.version)) {
        const previous=current?.state;
        if(dialog.open && (next.turn_key!==privateKey || next.state?.room.mode!=='multi' || !next.approved))close();
        current=next;
        const draw=()=>{render();announce(previous);};
        if(shouldSweep(previous?.phase,next.state?.phase,false))await wolfSweep(draw);
        else if(previous && next.state && skyChange(previous.phase,next.state.phase))await skySweep(draw,skyChange(previous.phase,next.state.phase));
        else draw();
      }
      if(dialog.open&&next.state?.phase==='wolves'&&dialog.querySelector('#pack-choices')){const detail=await request('player/private');const pack=dialog.querySelector('#pack-choices');if(pack&&detail.turn_key===privateKey)pack.textContent='狼隊選票 / Pack votes: '+(Object.entries(detail.info?.choices||{}).map(([seat,target])=>`${seat} → ${target??'空刀 / Pass'}`).join(' · ')||'—');}
    }catch(e){
      if(e.status===403){
        close();narrator.stop();chat.mount(null);credential=null;current=null;updateSound();localStorage.removeItem(storageKey);
        if(hash.has('invite'))await joinForm();
        else app.innerHTML=`<section class="empty"><h1>${sub('通行證已撤銷','Player pass revoked')}</h1><p>${sub('請重新打開主持人的房間邀請。','Open the host’s room invite to request your seat again.')}</p></section>`;
      }else error(e);
    }finally{polling=false;}
  }
  function choices(seats,optional=true) {
    return `<div class="target-grid">${seats.map(s=>`<label><input name="target" type="radio" value="${s}" ${optional?'':'required'}><span>${s} 號<span class="english-subtext">Seat ${s}</span></span></label>`).join('')}${optional?'<label class="pass"><input name="target" type="radio" value="" checked><span>放棄 · Pass</span></label>':''}</div>`;
  }
  async function openPrivate(roleOnly=false) {
    if(busy)return;
    try {const detail=await request('player/private');if(!detail.approved)return;drawPrivate(detail,roleOnly);if(!dialog.open)dialog.showModal();}
    catch(e){error(e);}
  }
  function drawPrivate(detail,roleOnly=false) {
    privateKey=detail.turn_key;
    const phase=detail.state.phase,info=detail.info;
    let controls=`<p class="notice">${sub('請等待你的回合，跟隨主裝置指示。','Wait for your turn and follow the main device.')}</p>`;
    let operation=null;
    if(!roleOnly&&detail.can_act) {
      if(phase==='reveal'){controls='<button class="primary" id="player-ready">記住身份，準備好了 · Ready</button>';}
      else if(phase==='seer' && info.inspection){controls=`<h2 class="player-private-title">${sub(`${info.inspection.seat} 號：${info.inspection.alignment==='bad'?'壞人陣營':'好人陣營'}`,`Seat ${info.inspection.seat}: ${info.inspection.alignment==='bad'?'Bad side':'Good side'}`)}</h2><button class="primary" id="player-ack">確認結果 · Confirm result</button>`;}
      else {
        operation=phase==='wolves'?'wolves':phase==='witch'?'witch':phase==='seer'?'inspect':phase==='hunter'?'shoot':'ballot';
        if(['witch','seer'].includes(phase) && !info.active)operation='inactive_pass';
        const optional=!['seer'].includes(phase) && (phase!=='wolves'||info.can_abstain);
        controls=`${phase==='wolves'?`<p class="notice">${sub(`存活狼隊：${info.wolves.join('、')} 號。必須選擇相同目標才會結算。`,`Living wolves: ${info.wolves.join(', ')}. All must agree on the same target.`)}</p><p class="room-status" id="pack-choices">${sub('已提交的狼隊選擇','Pack choices')}: ${Object.entries(info.choices).map(([seat,target])=>`${seat} → ${target??'空刀 / Pass'}`).join(' · ')||'—'}</p>`:''}${phase==='witch'&&info.active?`<p class="notice">${sub(info.kill?`今晚狼刀：${info.kill} 號`:'今晚空刀',info.kill?`Wolf target: seat ${info.kill}`:'No wolf target')}</p><p>${sub(detail.state.rules.witch_one_potion_per_night?'每晚限用一瓶藥。':'可同晚使用雙藥；每種藥全局一次。',detail.state.rules.witch_one_potion_per_night?'Use at most one potion tonight.':'Both potions may be used tonight; each is single-use per game.')}</p>`:''}${operation==='inactive_pass'?`<p class="notice">${sub('本回合只有掩護操作，不會使用能力。','This is a cover action. It has no power.')}</p>`:''}${['vote','runoff'].includes(phase)?`<h2>${sub('投出你的一票','Cast your vote')}</h2><p>${sub(info.submitted?'已投票；全部人完成前可修改。':'可投自己或棄權。全部人完成後自動結算。',info.submitted?'Submitted. You may change it until everyone has voted.':'Vote for yourself or abstain. Resolves when everyone submits.')}</p>`:''}<form id="player-action-form">${phase==='witch'&&info.can_save?'<label class="check-label"><input name="save" type="checkbox">使用解藥 · Use antidote</label>':''}${phase!=='witch'||info.can_poison||operation==='inactive_pass'?choices(operation==='inactive_pass'?detail.state.players.filter(p=>p.alive).map(p=>p.seat):info.targets,operation==='inactive_pass'||optional):''}<button class="primary">確認 · Confirm</button></form>`;
      }
    }
    dialog.innerHTML=`<p class="eyebrow">FOR YOUR EYES ONLY · 只供本人</p>${roleOnly||phase==='reveal'?roleCard(detail.role,detail.seat):''}${controls}${roleOnly||phase==='reveal'?roleTip(detail.role):''}<p class="room-error" id="player-private-error" role="alert"></p><button class="secondary" id="player-hide">收起 · Hide</button>`;
    bilingualize(dialog);
    dialog.querySelector('#player-hide').onclick=close;
    dialog.querySelector('#player-ready')?.addEventListener('click',()=>submit('ready',{},detail));
    dialog.querySelector('#player-ack')?.addEventListener('click',()=>submit('ack',{},detail));
    dialog.querySelector('#player-action-form')?.addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;
      const form=e.currentTarget,data=new FormData(form),target=data.get('target')?Number(data.get('target')):null;
      const payload=operation==='inactive_pass'?{}:operation==='witch'?{save:data.get('save')==='on',poison:target}:{target};
      if(operation==='witch'&&detail.state.rules.witch_one_potion_per_night&&payload.save&&target!==null){dialog.querySelector('#player-private-error').textContent='每晚只可使用一瓶藥。 / Only one potion per night.';return;}
      await submit(operation,payload,detail,form,target);
    });
  }
  async function submit(action,data,detail,form=null,target=null) {
    if(busy)return;busy=true;
    dialog.querySelectorAll('button,input').forEach(b=>b.disabled=true);
    try {
      if(form&&!['ballot','inactive_pass'].includes(action)){
        const targets=action==='witch'&&data.save?[...new Set([detail.info.kill,...(target===null?[]:[target])])]:[target];
        if(!(await Promise.all(targets.map(seat=>roleEffect(form,detail.state.phase,seat)))).every(Boolean))return;
      }
      const previous=current.state;const result=await request('player/actions',{turn_key:detail.turn_key,action,data});current=result;
      if(action==='inspect'){const fresh=await request('player/private');if(!document.hidden&&dialog.open)drawPrivate(fresh);}
      else{close();render();announce(previous);}
    }catch(e){if(dialog.open)dialog.querySelector('#player-private-error').textContent=e.message;await sync();}
    finally{busy=false;dialog.querySelectorAll('button,input').forEach(b=>b.disabled=false);}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){close();narrator.stop();}else sync(true);});
  dialog.addEventListener('cancel',close);
  window.addEventListener('pagehide',()=>{close();narrator.dispose();chat.stop();});
  if(credential){history.replaceState(null,'',`/#player=${id}`);await sync();}else if(hash.has('invite'))await joinForm();
  else app.innerHTML=`<section class="empty"><h1>${sub('此瀏覽器沒有玩家通行證','No player pass in this browser')}</h1><p>${sub('請向主持人索取房間邀請。','Ask your host for a room invite.')}</p><a href="/">首頁 · Home</a></section>`;
  setInterval(()=>{if(!busy)sync();},3000);
}
