/** Compact presentation only: existing buttons keep their action and ownership guards. */
export function simplifyHandoff(root,{debug,multi,seat,ready,total,viewer}){
  if(!root)return;root.classList.add('compact-handoff');
  root.querySelector(':scope > .eyebrow').textContent=debug?'DEBUG':'THE VILLAGE · 村莊';
  root.querySelector('h2').innerHTML='身份準備<span class="english-subtext" lang="en">Role setup</span>';
  const progress=document.createElement('p');progress.className='handoff-progress';progress.textContent=`已確認 ${ready} / ${total} · Ready`;
  root.querySelector('h2').after(progress);
  root.querySelector('.handoff-seat-label')?.replaceChildren(document.createTextNode('目前座位 · CURRENT SEAT'));
  const instruction=root.querySelector(':scope > .muted');
  instruction.innerHTML=viewer?'所有玩家確認後開始首夜。<span class="english-subtext" lang="en">The first night starts after everyone confirms.</span>':multi&&!debug?'請各玩家私下確認身份。<span class="english-subtext" lang="en">Each player confirms their role privately.</span>':'私下查看，確認後收起。<span class="english-subtext" lang="en">View privately, then hide.</span>';
  const mine=root.querySelector('#host-own-role'),ownAction=root.querySelector('#host-own-action');
  root.querySelectorAll(':scope > .notice').forEach(el=>el.remove());
  const actions=document.createElement('div');actions.className='handoff-actions';
  const stage=root.querySelector('#stage-action'),skip=root.querySelector('#skip-reveal');
  if(skip){skip.className='primary';skip.innerHTML='略過身份交接<span class="english-subtext" lang="en">Skip handoff</span>';actions.append(skip);}
  if(stage){stage.className=debug?'secondary':'primary';stage.innerHTML=`查看 ${seat} 號身份<span class="english-subtext" lang="en">View seat ${seat}’s role</span>`;actions.append(stage);}
  if(mine)actions.append(mine);
  if(!debug&&ownAction)actions.append(ownAction);else ownAction?.remove();
  const privacy=root.querySelector(':scope > .fineprint');
  privacy?.remove();
  root.append(actions);
  const reminder=document.createElement('p');reminder.className='handoff-privacy';reminder.innerHTML=viewer?'等待玩家確認身份。<span class="english-subtext" lang="en">Waiting for players to confirm.</span>':'僅本人查看；切換分頁自動遮蔽。<span class="english-subtext" lang="en">Private view only. Switching tabs hides it.</span>';
  root.append(reminder);
  if(debug){const status=document.createElement('p');status.id='handoff-control-status';status.className='handoff-control-status';status.setAttribute('role','status');root.append(status);}
}
