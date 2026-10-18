const roles = {
  wolf: ['狼人','WEREWOLF','THE CRIMSON PACK','壞人陣營 · BAD SIDE'],
  seer: ['預言家','SEER','THE VEIL WALKER','好人陣營 · GOOD SIDE'],
  witch: ['女巫','WITCH','THE MOON APOTHECARY','好人陣營 · GOOD SIDE'],
  hunter: ['獵人','HUNTER','THE LAST ARROW','好人陣營 · GOOD SIDE'],
  villager: ['平民','VILLAGER','THE LANTERN KEEPER','好人陣營 · GOOD SIDE']
};
let artLoaded=false,artLoading,artFallback=false;
export function preloadCharacterArt(){
  if(typeof document==='undefined')return Promise.resolve();
  if(artLoading)return artLoading;
  artLoading=fetch('/assets/character-cards.svg').then(response=>{
    if(!response.ok)throw new Error('Character artwork unavailable');return response.text();
  }).then(source=>{
    const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
    if(parsed.querySelector('parsererror'))throw new Error('Invalid character artwork');
    const sprite=document.importNode(parsed.documentElement,true);
    sprite.classList.add('character-sprite');sprite.setAttribute('aria-hidden','true');
    sprite.setAttribute('width','0');sprite.setAttribute('height','0');document.body.append(sprite);
    artLoaded=true;
    document.querySelectorAll('.identity-card').forEach(card=>card.classList.add('identity-art-ready'));
  }).catch(()=>{
    artFallback=true;
    // Keep the role text usable during an outage, with static external art fallback.
    document.querySelectorAll('.identity-card use').forEach(use=>use.setAttribute('href','/assets/character-cards.svg'+use.getAttribute('href')));
    document.querySelectorAll('.identity-card').forEach(card=>card.classList.add('identity-art-ready'));
    artLoading=null;
  });
  return artLoading;
}
if(typeof document!=='undefined')void preloadCharacterArt();
export function roleCard(role, seat) {
  if(!roles[role]) return '';
  const [zh,en,title,side]=roles[role];
  return `<article class="identity-card ${role==='wolf'?'identity-bad':'identity-good'} ${artLoaded||artFallback?'identity-art-ready':''}" aria-label="${zh} / ${en}"><div class="identity-top"><span>MOONFALL</span><span>SEAT ${String(seat).padStart(2,'0')}</span></div><div class="identity-art"><svg class="identity-aura" viewBox="0 0 260 270" aria-hidden="true"><use href="${artFallback?'/assets/character-cards.svg':''}#character-aura"></use></svg><svg class="identity-figure" viewBox="0 0 260 270" aria-hidden="true"><use href="${artFallback?'/assets/character-cards.svg':''}#character-${role}"></use></svg></div><p class="identity-title">${title}</p><h3>${zh}<span class="english-subtext" lang="en">${en}</span></h3><p class="identity-side">${side}</p><span class="identity-seal" aria-hidden="true">✦</span></article>`;
}
