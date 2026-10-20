let narratorDialog;
export function clearNarratorPanel(close=false){if(!narratorDialog)return;if(close)narratorDialog.close();narratorDialog.replaceChildren();}
export function mountNarratorPanel(content,replay){
  if(!content){clearNarratorPanel(true);return;}
  if(!narratorDialog){narratorDialog=document.createElement('dialog');narratorDialog.className='chat-overlay narrator-overlay';narratorDialog.setAttribute('aria-label','語音主持設定 / Narrator settings');document.body.append(narratorDialog);narratorDialog.onclose=()=>{const button=document.querySelector('.narrator-launcher');button?.setAttribute('aria-expanded','false');button?.focus({preventScroll:true});};narratorDialog.onclick=e=>{const r=narratorDialog.getBoundingClientRect();if(e.target===narratorDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))narratorDialog.close();};}
  const launcher=document.createElement('button');launcher.type='button';launcher.className='narrator-launcher';launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-expanded',String(narratorDialog.open));launcher.setAttribute('aria-label','開啟語音主持設定 / Open narrator settings');launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg><span>旁白<span lang="en">Narrator</span></span>';
  content.before(launcher);launcher.onclick=()=>{narratorDialog.showModal();launcher.setAttribute('aria-expanded','true');};
  const open=narratorDialog.open;
  narratorDialog.innerHTML='<header class="chat-heading"><div><p class="eyebrow">THE NARRATOR · 語音主持</p><h3>旁白設定<span class="english-subtext" lang="en">Narration settings</span></h3></div><button class="icon-button narrator-close" type="button" aria-label="關閉 / Close" autofocus>×</button></header><div class="narrator-body"></div>';
  narratorDialog.querySelector('.narrator-close').onclick=()=>narratorDialog.close();
  narratorDialog.querySelector('.narrator-body').append(content);if(replay)narratorDialog.querySelector('.narrator-body').append(replay);
  if(open)narratorDialog.querySelector('.narrator-close').focus({preventScroll:true});
}
export function selectedPlayMode(){return document.querySelector('input[name="play-mode"]:checked')?.value||'remote';}
export function updateRuleSummary(){
  const el=document.querySelector('#rules-summary');if(!el)return;
  const checked=id=>document.querySelector('#'+id).checked;
  const mode={single:['共用裝置','Shared device'],multi:['同場各用手機','In-person phones'],remote:['遠端連線','Remote play']}[selectedPlayMode()];
  const chips=[mode,document.querySelector('#speech-language').value==='en'?['英語旁白','English voice']:['廣東話旁白','Cantonese voice'],checked('fun-mode')?['娛樂模式','Fun mode']:['標準角色','Standard cast'],checked('potion-limit')?['每晚限一瓶藥','One potion per night']:['可同晚用雙藥','Both potions allowed'],checked('wolf-abstain')?['狼人可空刀','Wolves may pass']:['狼人須選目標','Wolf target required'],checked('last-words')?['設有遺言','Last words on']:['不設遺言','Last words off'],checked('self-save')?['女巫可自救','Witch self-save allowed']:['女巫不可自救','No witch self-save'],checked('witch-acts')?['女巫被刀可行動','Witch may act when attacked']:['女巫被刀不可行動','Witch cannot act when attacked'],checked('parity')?['狼人平票人數即勝','Wolves win at parity']:['不設狼人平票勝利','Parity victory disabled'],[`討論 ${Number(document.querySelector('#duration').value)||0} 秒`,`Discussion: ${Number(document.querySelector('#duration').value)||0} seconds`]];
  el.innerHTML=chips.map(([zh,en])=>`<span>${zh}<small lang="en">${en}</small></span>`).join('');
}
