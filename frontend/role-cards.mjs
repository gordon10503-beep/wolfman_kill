const roles = {
  wolf: ['狼人','WEREWOLF','THE CRIMSON PACK','壞人陣營 · BAD SIDE'],
  seer: ['預言家','SEER','THE VEIL WALKER','好人陣營 · GOOD SIDE'],
  guard: ['守衛','GUARDIAN','THE AEGIS OF DUSK','好人陣營 · GOOD SIDE'],
  witch: ['女巫','WITCH','THE MOON APOTHECARY','好人陣營 · GOOD SIDE'],
  hunter: ['獵人','HUNTER','THE LAST ARROW','好人陣營 · GOOD SIDE'],
  knight: ['騎士','KNIGHT','THE OATHBOUND BLADE','好人陣營 · GOOD SIDE'],
  gravedigger: ['守墓人','GRAVEDIGGER','THE KEEPER OF ECHOES','好人陣營 · GOOD SIDE'],
  idiot: ['白痴神','IDIOT','THE HIDDEN WISDOM','好人陣營 · GOOD SIDE'],
  villager: ['平民','VILLAGER','THE LANTERN KEEPER','好人陣營 · GOOD SIDE']
};
export const characterRoles=Object.keys(roles);
let artLoaded=false,artLoading,artFallback=false;
const figures={};
function hydrateArt(){
  document.querySelectorAll('[data-character-role]').forEach(figure=>{
    const role=figure.dataset.characterRole;
    if(!roles[role])return;
    figure.innerHTML=figures[role] || (artFallback?`<use href="/assets/character-cards.svg#character-${role}"></use>`:'');
  });
  document.querySelectorAll('.identity-card').forEach(card=>card.classList.add('identity-art-ready'));
}
export function preloadCharacterArt(){
  if(typeof document==='undefined')return Promise.resolve();
  if(artLoading)return artLoading;
  artLoading=fetch('/assets/character-cards.svg').then(response=>{
    if(!response.ok)throw new Error('Character artwork unavailable');return response.text();
  }).then(source=>{
    const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
    if(parsed.querySelector('parsererror'))throw new Error('Invalid character artwork');
    for(const role of Object.keys(roles))figures[role]=parsed.getElementById(`character-${role}`).innerHTML;
    const sprite=document.importNode(parsed.documentElement,true);
    sprite.classList.add('character-sprite');sprite.setAttribute('aria-hidden','true');
    sprite.setAttribute('width','0');sprite.setAttribute('height','0');document.body.append(sprite);
    artLoaded=true;
    hydrateArt();
  }).catch(()=>{
    artFallback=true;
    // Keep the role text usable during an outage, with static external art fallback.
    document.querySelectorAll('.identity-card use,.cast-art use').forEach(use=>{const href=use.getAttribute('href');if(href?.startsWith('#'))use.setAttribute('href','/assets/character-cards.svg'+href);});
    hydrateArt();
    artLoading=null;
  });
  return artLoading;
}
if(typeof document!=='undefined')void preloadCharacterArt();
/** Actual SVG children let each eye, arrow and potion animate independently. */
export function characterArt(role,kind='identity'){
  if(!roles[role])return '';
  const prefix=kind==='cast'?'cast':'identity',file=artFallback?'/assets/character-cards.svg':'';
  return `<svg class="${prefix==='cast'?'cast-art':'identity-artwork'}" viewBox="0 0 260 270" aria-hidden="true"><g class="${prefix}-aura"><use href="${file}#character-aura"></use></g><g class="character-ground"><use href="${file}#character-ground"></use></g><g class="${prefix}-figure" data-character-role="${role}">${figures[role] || (artFallback?`<use href="${file}#character-${role}"></use>`:'')}</g></svg>`;
}
export function roleCard(role, seat) {
  if(!roles[role]) return '';
  const [zh,en,title,side]=roles[role];
  return `<article class="identity-card ${role==='wolf'?'identity-bad':'identity-good'} ${artLoaded||artFallback?'identity-art-ready':''}" aria-label="${zh} / ${en}"><div class="identity-top"><span>MOONFALL</span><span>${seat==null?'THE ARCHIVE':`SEAT ${String(seat).padStart(2,'0')}`}</span></div><div class="identity-art">${characterArt(role)}</div><p class="identity-title">${title}</p><h3>${zh}<span class="english-subtext" lang="en">${en}</span></h3><p class="identity-side">${side}</p><span class="identity-seal" aria-hidden="true">✦</span></article>`;
}

/** Keep the entrance visible instead of auto-scrolling to Hide below long role tips. */
export function focusRoleCard(dialog){
  const card=dialog.querySelector('.identity-card');if(!card)return;
  card.tabIndex=-1;card.focus({preventScroll:true});dialog.scrollTop=0;
}
