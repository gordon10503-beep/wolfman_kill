const roles = {
  wolf: ['狼人','WEREWOLF','THE CRIMSON PACK','壞人陣營 · BAD SIDE'],
  seer: ['預言家','SEER','THE VEIL WALKER','好人陣營 · GOOD SIDE'],
  witch: ['女巫','WITCH','THE MOON APOTHECARY','好人陣營 · GOOD SIDE'],
  hunter: ['獵人','HUNTER','THE LAST ARROW','好人陣營 · GOOD SIDE'],
  villager: ['平民','VILLAGER','THE LANTERN KEEPER','好人陣營 · GOOD SIDE']
};
export function roleCard(role, seat) {
  if(!roles[role]) return '';
  const [zh,en,title,side]=roles[role];
  return `<article class="identity-card ${role==='wolf'?'identity-bad':'identity-good'}" aria-label="${zh} / ${en}"><div class="identity-top"><span>MOONFALL</span><span>SEAT ${String(seat).padStart(2,'0')}</span></div><div class="identity-art"><svg viewBox="0 0 260 270" aria-hidden="true"><use href="/assets/character-cards.svg#${role}"></use></svg></div><p class="identity-title">${title}</p><h3>${zh}<span class="english-subtext" lang="en">${en}</span></h3><p class="identity-side">${side}</p><span class="identity-seal" aria-hidden="true">✦</span></article>`;
}
