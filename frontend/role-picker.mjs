import {roleLabels,englishRoleLabels} from './new-roles.mjs';
import {characterArt} from './role-cards.mjs';

/** Stage choices in a dialog; the cast changes only after confirmation. */
export function openRolePicker(roles,selected,onConfirm){
  let dialog=document.querySelector('#role-picker');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='role-picker';dialog.className='role-picker';dialog.setAttribute('aria-label','選擇特殊角色 / Choose special characters');document.body.append(dialog);}
  dialog.innerHTML=`<button type="button" class="close" aria-label="關閉 / Close">×</button><p class="eyebrow">CHOOSE YOUR SECRETS</p><h2>加入特殊角色<span class="english-subtext" lang="en">Add special characters</span></h2><p>可選多個角色，確認後才加入列表。新加入的角色預設 1 位，之後可調整人數。<span class="english-subtext" lang="en">Select multiple roles, then confirm. Newly added roles start at one player; adjust their counts in the cast table.</span></p><form><div class="role-picker-grid">${roles.map(role=>`<label class="role-picker-option"><input type="checkbox" name="roles" value="${role}" ${selected.has(role)?'checked':''}>${characterArt(role,'cast')}<strong>${roleLabels[role]}<span class="english-subtext" lang="en">${englishRoleLabels[role]}</span></strong></label>`).join('')}</div><div class="button-row"><button type="button" class="secondary" id="cancel-role-picker">取消 · Cancel</button><button type="submit" class="primary">確認角色 · Confirm characters</button></div></form>`;
  const close=()=>dialog.close();dialog.querySelector('.close').onclick=close;dialog.querySelector('#cancel-role-picker').onclick=close;
  dialog.onclose=()=>document.querySelector('#cast-expand')?.focus({preventScroll:true});
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const choices=new Set(new FormData(e.currentTarget).getAll('roles'));close();onConfirm(choices);};
  dialog.showModal();
}
