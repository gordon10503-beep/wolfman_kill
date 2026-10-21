const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actions={hidden_wolf:['確認狼隊','Review the wolf team'],wolf_beauty:['選擇魅惑','Choose a charm'],wolf_king_shot:['狼王最後一槍','Wolf King’s final shot'],guard:['選擇守護','Choose protection'],gravedigger:['查看放逐陣營','Read the exile’s alignment'],discussion:['使用白天能力','Use your daytime ability'],reveal:['確認身份','Confirm your role'],wolves:['投票選擇狼刀','Vote for the wolf target'],witch:['使用藥水','Choose potions'],seer:['查驗玩家','Investigate a player'],hunter:['決定最後一槍','Take your final shot'],vote:['投票','Vote'],runoff:['加賽投票','Runoff vote']};
export function actionLabel(phase,dayAction){if(phase==='discussion'&&dayAction)return dayAction==='explode'?'白狼王自爆 · White Wolf King explosion':'騎士決鬥 · Knight’s duel';return (actions[phase]||['等待下一階段','Waiting for the next phase']).join(' · ');}
export function hasPlayerAction(phase){return phase in actions;}
export function wolfVoteSummary(info){
  const round=info.round===2?'加賽 · Runoff':'首輪 · Round 1';
  return `<p class="notice">狼刀投票 ${round}<span class="english-subtext" lang="en">Wolf voting · ${round}</span>全部有狼刀權玩家投票後，以最高票決定目標；平票加賽一次，再平票則空刀。<span class="english-subtext" lang="en">After all eligible wolves vote, the most votes wins. A tie gets one runoff among tied targets; a second tie means no kill. Abstentions do not count as a target.</span>${info.round===2?`<span class="english-subtext">平票目標 / Tied targets: ${(info.runoff||[]).map(esc).join(', ')}</span>`:''}</p>`;
}
function chosenVolume(){const saved=sessionStorage.getItem('moonfall-volume');return saved===null?1:Math.min(1,Math.max(0,Number(saved)||0));}
export function voiceVolume(){return sessionStorage.getItem('moonfall-volume-muted')==='true'?0:chosenVolume();}
export function bindVolume(narrator){
  const slider=document.querySelector('#volume'),button=document.querySelector('#volume-mute');if(!slider)return;
  const paint=()=>{slider.value=chosenVolume();if(button){const muted=voiceVolume()===0;button.setAttribute('aria-pressed',String(muted));button.dataset.muted=String(muted);button.title=muted?'取消靜音 / Unmute':'靜音 / Mute';button.setAttribute('aria-label',button.title);}};
  slider.oninput=()=>{sessionStorage.setItem('moonfall-volume',slider.value);sessionStorage.setItem('moonfall-volume-muted','false');if(Number(slider.value)>0)sessionStorage.setItem('moonfall-volume-audible',slider.value);narrator.setVolume(voiceVolume());paint();};
  if(button)button.onclick=()=>{if(voiceVolume()>0){sessionStorage.setItem('moonfall-volume-muted','true');}else{if(chosenVolume()===0)sessionStorage.setItem('moonfall-volume',sessionStorage.getItem('moonfall-volume-audible')||'1');sessionStorage.setItem('moonfall-volume-muted','false');}narrator.setVolume(voiceVolume());paint();};
  paint();
}
export function voteRecords(history=[]){
  if(!history.length)return '';
  return `<section class="vote-records"><h3>公開票型<span class="english-subtext" lang="en">Who voted for whom</span></h3>${[...history].reverse().map(v=>`<details ${v===history.at(-1)?'open':''}><summary>第 ${v.day} 輪 · ${v.round==='runoff'?'加賽 / Runoff':'公投 / Vote'}</summary><div class="vote-ledger">${Object.entries(v.ballots).map(([seat,target])=>`<span>${esc(seat)} 號 → ${target===null?'棄權 / Abstain':`${esc(target)} 號 / Seat ${esc(target)}`}</span>`).join('')}</div></details>`).join('')}</section>`;
}
