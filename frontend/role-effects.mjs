export function privacyReminder() {
  return `<aside class="role-tip"><strong>保密提醒 · KEEP THE NIGHT SECRET</strong><p>即使已出局，夜間叫到你的角色時，仍請協助開啟畫面、選擇座位及按確認，避免其他人從點擊聲或沒有點擊聲猜到身份。掩護操作不會使用能力。<span class="english-subtext" lang="en">Even after elimination, open your role screen, select a seat and confirm when called at night. Keep making the usual clicks so sounds—or silence—do not reveal your role. Cover actions have no power.</span></p><p>無法行動的女巫或預言家，若沒有人操作，閒置 10 秒後自動繼續。獵人的最後一槍仍須親自確認。<span class="english-subtext" lang="en">An inactive witch or seer turn continues automatically after 10 seconds without interaction. The hunter’s final shot still requires confirmation.</span></p></aside>`;
}

export function roleTip(role) { return ['wolf','witch','seer','hunter'].includes(role) ? privacyReminder() : ''; }

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
  ],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
  const flip = card.animate([{transform:'perspective(500px) rotateY(0)'},{transform:'perspective(500px) rotateY(360deg)'}],{duration:650,delay:150,easing:'ease-in-out'});
  try { await Promise.all([flight.finished,flip.finished]); return dialog.open && form.isConnected && !document.hidden; }
  catch { return false; }
  finally { flight.cancel(); flip.cancel(); icon.remove(); }
}
