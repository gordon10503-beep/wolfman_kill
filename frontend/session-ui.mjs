const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actions={guard:['選擇守護','Choose protection'],gravedigger:['查看放逐陣營','Read the exile’s alignment'],discussion:['騎士決鬥','Knight’s duel'],reveal:['確認身份','Confirm your role'],wolves:['投票選擇狼刀','Vote for the wolf target'],witch:['使用藥水','Choose potions'],seer:['查驗玩家','Investigate a player'],hunter:['決定最後一槍','Take your final shot'],vote:['投票','Vote'],runoff:['加賽投票','Runoff vote']};
export function actionLabel(phase){return (actions[phase]||['等待下一階段','Waiting for the next phase']).join(' · ');}
export function hasPlayerAction(phase){return phase in actions;}
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
