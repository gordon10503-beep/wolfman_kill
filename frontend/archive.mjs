import {roleCard,characterRoles,preloadCharacterArt} from './role-cards.mjs';
let generation=0;

/** A public art collection; it never reads a game's assigned roles. */
export function openArchive(){
  const request=++generation;
  let dialog=document.querySelector('#archive-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='archive-dialog';dialog.className='archive-dialog';dialog.setAttribute('aria-label','角色圖鑑 / Character archive');document.body.append(dialog);}
  dialog.classList.remove('archive-opened');
  dialog.innerHTML=`<button class="close" id="archive-close" aria-label="關閉圖鑑 / Close archive">×</button><header class="archive-heading"><p class="eyebrow">THE VILLAGE · ILLUMINATED</p><h2>村莊圖鑑 <span>Character archive</span></h2><p>每個秘密，都有它的模樣。<span lang="en">Every secret has a face.</span></p></header><button type="button" id="archive-motion" class="icon-button archive-motion"></button><div class="archive-book"><div class="archive-pages" aria-hidden="true"></div><button class="archive-cover" id="archive-unseal" aria-label="打開魔法書 / Open the magic book"><span class="book-edition">THE MOONFALL ARCHIVE · VOL. I</span><span class="book-crescent" aria-hidden="true">☾</span><span class="book-orbit" aria-hidden="true">✦</span><span class="book-title">MOONFALL<span>村 莊 圖 鑑</span></span><span class="book-rule" aria-hidden="true">✧ ── ◇ ── ✧</span><span class="book-open-label">輕觸，揭開秘密<span lang="en">Tap to open the grimoire</span></span><span class="book-clasp" aria-hidden="true">✦</span></button></div><div class="archive-cards" id="archive-cards"></div><p class="archive-caption">公開角色美術，與本局身份無關。<span lang="en">Public artwork. No assigned game identities are shown.</span></p>`;
  const motion=dialog.querySelector('#archive-motion');
  const syncMotion=()=>{const on=document.querySelector('#motion')?.getAttribute('aria-pressed')==='true';motion.textContent=on?'動畫開啟 · Motion on':'動畫關閉 · Motion off';motion.setAttribute('aria-pressed',String(on));motion.title=on?'暫停動畫 / Pause animation':'播放開書與卡牌動畫 / Enable book and card animations';};
  motion.onclick=()=>{document.querySelector('#motion')?.click();syncMotion();};syncMotion();
  const close=()=>{generation++;dialog.close();dialog.replaceChildren();};
  dialog.querySelector('#archive-close').onclick=close;
  dialog.oncancel=event=>{event.preventDefault();close();};
  dialog.querySelector('#archive-unseal').onclick=async event=>{
    event.currentTarget.disabled=true;
    await preloadCharacterArt();
    if(!dialog.open || request!==generation)return;
    dialog.querySelector('#archive-cards').innerHTML=characterRoles.map(role=>`<div class="archive-card">${roleCard(role,null)}</div>`).join('');
    const origin=dialog.querySelector('.archive-book');
    dialog.style.setProperty('--archive-book-x',`${origin.offsetLeft}px`);dialog.style.setProperty('--archive-book-y',`${origin.offsetTop}px`);
    dialog.classList.add('archive-preparing','archive-opened');
    // Measure once; CSS handles the entire flight without a frame loop.
    const book=dialog.querySelector('.archive-book').getBoundingClientRect();
    const flights=[...dialog.querySelectorAll('.archive-card')].map(card=>({card,rect:card.getBoundingClientRect()}));
    flights.forEach(({card,rect},i)=>{
      card.style.setProperty('--card-order',i);
      card.style.setProperty('--flight-x',`${book.x+book.width/2-rect.x-rect.width/2}px`);
      card.style.setProperty('--flight-y',`${book.y+book.height/2-rect.y-rect.height/2}px`);
      card.style.setProperty('--flight-turn',`${(i%3-1)*14}deg`);
    });
    dialog.classList.remove('archive-preparing');
    dialog.querySelector('#archive-close').focus({preventScroll:true});
  };
  dialog.showModal();dialog.scrollTop=0;
}
