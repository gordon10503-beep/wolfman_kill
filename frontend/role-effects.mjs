export function privacyReminder() {
  return `<aside class="role-tip"><strong>保密提醒 · KEEP THE NIGHT SECRET</strong><p>即使已出局，夜間叫到你的角色時，仍請協助開啟畫面、選擇座位及按確認，避免其他人從點擊聲或沒有點擊聲猜到身份。掩護操作不會使用能力。<span class="english-subtext" lang="en">Even after elimination, open your role screen, select a seat and confirm when called at night. Keep making the usual clicks so sounds—or silence—do not reveal your role. Cover actions have no power.</span></p><p>無法行動的夜間特殊角色，若沒有人操作，閒置 10 秒後自動繼續。獵人的最後一槍仍須親自確認。<span class="english-subtext" lang="en">An inactive special-role night turn continues automatically after 10 seconds without interaction. The hunter’s final shot still requires confirmation.</span></p></aside>`;
}

const newTips={
  guard:['每晚守護一人，可自守或放棄，不能連續守同一人。守護只擋狼刀；守救同中依房規。','Protect one player nightly, including yourself, or pass. No consecutive protection of the same seat. Blocks wolves, not poison. Protection plus antidote follows the house rule.'],
  knight:['白天討論時可翻牌決鬥一次。對方是狼人：狼人出局並直接入夜；否則自己出局，討論繼續。','Duel once during daytime discussion. A wolf target dies and night begins; otherwise you die and discussion continues.'],
  gravedigger:['每晚私下得知前一個白天被投票放逐者的陣營。首夜、無放逐、白痴神免死及技能死亡皆沒有結果。','Privately learn the previous day’s voting exile’s alignment. No result on the first night, with no exile, for a spared Idiot or for an ability death.'],
  idiot:['被投票放逐時翻牌免死，之後沒有投票權，也不能再被放逐；狼刀、毒藥及技能仍可令你出局。','Reveal and survive voting exile, then lose voting rights and eligibility for further exile. Wolf kills, poison and abilities can still eliminate you.']
};
export function roleTip(role) { const tip=newTips[role]; return (tip?`<aside class="role-tip"><strong>能力 · ABILITY</strong><p>${tip[0]}<span class="english-subtext" lang="en">${tip[1]}</span></p></aside>`:'')+ (['wolf','witch','seer','hunter','guard','gravedigger'].includes(role) ? privacyReminder() : ''); }

/** All visuals stay inside the private dialog, before any result is shown. */
export async function roleEffect(form, role, seat) {
  if (seat === null || document.hidden || sessionStorage.getItem('moonfall-forest-motion') === 'off') return form.isConnected;
  const card = form.querySelector(`input[name="target"][value="${seat}"]`)?.nextElementSibling || form.querySelector(`[data-seat="${seat}"]`);
  const dialog = form.closest('dialog');
  if (!dialog?.open) return false;
  if (!card || typeof card.animate !== 'function') return true;
  const origin = form.querySelector('button').getBoundingClientRect(), destination = card.getBoundingClientRect();
  const icon = document.createElement('span');
  icon.className = `role-projectile role-projectile-${role}`;
  icon.setAttribute('aria-hidden','true');
  if (role === 'seer') icon.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="20" cy="20" r="12"/><path d="m29 29 13 13"/></svg>';
  else icon.innerHTML = `<svg viewBox="0 0 48 48"><use href="/assets/roles.svg#${role==='wolves'?'wolf':role}"></use></svg>`;
  dialog.append(icon);
  const flight = icon.animate([
    {transform:`translate(${origin.x+origin.width/2-22}px,${origin.y-22}px) scale(.6)`,opacity:0},
    {offset:.18,opacity:1},
    {transform:`translate(${destination.x+destination.width/2-22}px,${destination.y+destination.height/2-22}px) scale(1.15)`,opacity:1}
  ],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
  const flip = card.animate([{transform:'perspective(500px) rotateY(0)'},{transform:'perspective(500px) rotateY(360deg)'}],{duration:650,delay:150,easing:'ease-in-out'});
  try { await Promise.all([flight.finished,flip.finished]); return dialog.open && form.isConnected && !document.hidden; }
  catch { return false; }
  finally { icon.remove(); flight.cancel(); flip.cancel(); }
}
