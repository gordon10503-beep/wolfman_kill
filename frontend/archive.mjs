import {wolfRoles,roleLabels,englishRoleLabels} from './new-roles.mjs';
import {roleTip} from './role-effects.mjs';
import {roleCard,characterRoles,preloadCharacterArt} from './role-cards.mjs';
let generation=0;
export function archiveRoles(chapter='all'){return characterRoles.filter(role=>chapter==='all'||(chapter==='bad'?wolfRoles.includes(role):!wolfRoles.includes(role)));}

/** A public art collection; it never reads a game's assigned roles. */
export function openArchive(){
  const request=++generation;
  let dialog=document.querySelector('#archive-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='archive-dialog';dialog.className='archive-dialog';dialog.setAttribute('aria-label','角色圖鑑 / Character archive');document.body.append(dialog);}
  dialog.classList.remove('archive-opened','archive-chapter-change');
  dialog.dataset.chapter='all';
  dialog.innerHTML=`<button class="close" id="archive-close" aria-label="關閉圖鑑 / Close archive">×</button><header class="archive-heading"><p class="eyebrow">THE VILLAGE · ILLUMINATED</p><h2>村莊圖鑑 <span>Character archive</span></h2><p>每個秘密，都有它的模樣。<span lang="en">Every secret has a face.</span></p></header><button type="button" id="archive-motion" class="icon-button archive-motion"></button><div class="archive-chapters" role="tablist" aria-label="圖鑑章節 / Archive chapters" hidden>${[['all','I','全部角色','All characters'],['bad','II','狼人陣營','Bad side'],['good','III','好人陣營','Good side']].map(([key,n,zh,en])=>`<button type="button" role="tab" id="chapter-${key}" data-chapter="${key}" aria-selected="${key==='all'}" aria-controls="archive-cards" tabindex="${key==='all'?0:-1}"><small>CHAPTER ${n}</small><span>${zh}<span lang="en">${en}</span></span></button>`).join('')}</div><div class="archive-book"><div class="archive-pages" aria-hidden="true"></div><button class="archive-cover" id="archive-unseal" aria-label="打開魔法書 / Open the magic book"><span class="book-edition">THE MOONFALL ARCHIVE · VOL. I</span><span class="book-crescent" aria-hidden="true">☾</span><span class="book-orbit" aria-hidden="true">✦</span><span class="book-title">MOONFALL<span>村 莊 圖 鑑</span></span><span class="book-rule" aria-hidden="true">✧ ── ◇ ── ✧</span><span class="book-open-label">輕觸，揭開秘密<span lang="en">Tap to open the grimoire</span></span><span class="book-clasp" aria-hidden="true">✦</span></button></div><div class="archive-cards" id="archive-cards" role="tabpanel" aria-labelledby="chapter-all"></div><p class="archive-caption">公開角色美術，與本局身份無關。<span lang="en">Public artwork. No assigned game identities are shown.</span></p>`;
  const cards=dialog.querySelector('#archive-cards');
  const chapters=[...dialog.querySelectorAll('[data-chapter]')];
  const openGuide=role=>{
    const guide=document.createElement('dialog');guide.className='archive-role-guide';guide.setAttribute('aria-label',`${roleLabels[role]} · ${englishRoleLabels[role]}`);
    const basics={wolf:['每晚與狼隊共同選擇一名目標；白天隱藏身份，爭取狼隊勝利。空刀依房規。','Choose a nightly target with your wolf teammates. Hide your identity by day. Passing depends on house rules.'],seer:['每晚查驗另一位存活玩家，得知好人或壞人陣營；隱狼會顯示為好人。','Investigate another living player each night to learn Good or Bad side. Hidden Wolves appear good.'],witch:['每位女巫各有一瓶解藥及毒藥，全局各用一次。解藥只救當晚狼刀目標；每晚用藥數、自救及被刀能否行動依房規。','Each witch has one antidote and one poison for the whole game. Antidote saves the wolves’ target. Nightly limits, self-saving and acting when attacked follow house rules.'],hunter:['被狼刀、投票放逐或槍殺後可選擇開槍帶走一人；毒藥、決鬥、自爆及殉情不能開槍。','After a wolf kill, voting exile or shooting, choose a final shot. Poison, duels, explosions and charm deaths prevent it.'],villager:['沒有夜間能力。透過白天討論及投票找出狼隊，與好人陣營共同獲勝。','You have no night ability. Use daytime discussion and voting to identify wolves and win with the good side.']};
    const tip=basics[role];guide.innerHTML=`<button class="close" aria-label="關閉角色指南 / Close character guide">×</button><h2>${roleLabels[role]}<span class="english-subtext" lang="en">${englishRoleLabels[role]}</span></h2>${tip?`<p>${tip[0]}<span class="english-subtext" lang="en">${tip[1]}</span></p>`:''}${roleTip(role)}`;
    dialog.append(guide);guide.querySelector('button').onclick=()=>guide.close();guide.onclose=()=>guide.remove();guide.showModal();
  };
  const renderCards=chapter=>{dialog.dataset.chapter=chapter;cards.innerHTML=archiveRoles(chapter).map(role=>`<div class="archive-card" role="button" tabindex="0" data-role="${role}" aria-label="${roleLabels[role]} · ${englishRoleLabels[role]} · 角色指南 / Character guide">${roleCard(role,null)}</div>`).join('');cards.setAttribute('aria-labelledby',`chapter-${chapter}`);cards.querySelectorAll('[data-role]').forEach(card=>{card.onclick=()=>openGuide(card.dataset.role);card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();card.click();}};});};
  chapters.forEach((button,index)=>{
    button.onclick=()=>{for(const tab of chapters){const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}dialog.classList.add('archive-chapter-change');renderCards(button.dataset.chapter);dialog.scrollTop=0;};
    button.onkeydown=event=>{let next;if(event.key==='ArrowRight')next=(index+1)%chapters.length;else if(event.key==='ArrowLeft')next=(index+chapters.length-1)%chapters.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=chapters.length-1;else return;event.preventDefault();chapters[next].click();chapters[next].focus({preventScroll:true});};
  });
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
    renderCards('all');
    const origin=dialog.querySelector('.archive-book');
    origin.onanimationend=event=>{if(event.target===origin&&event.animationName==='book-vanish')origin.hidden=true;};
    dialog.style.setProperty('--archive-book-x',`${origin.offsetLeft}px`);dialog.style.setProperty('--archive-book-y',`${origin.offsetTop}px`);
    dialog.classList.add('archive-preparing','archive-opened');
    dialog.querySelector('.archive-chapters').hidden=false;
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
