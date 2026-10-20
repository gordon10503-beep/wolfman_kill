const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={public:'村莊討論 · Village chat',wolves:'狼隊密談 · Private wolf chat',spectators:'觀眾與亡者 · Spectators & eliminated'};

/** Separate cursors keep chat from invalidating private forms or replaying audio. */
export class RoomChat{
  constructor({context,request}){Object.assign(this,{context,request});this.channels={};this.readThrough={};this.drafts={};this.active='public';this.generation=0;document.addEventListener('visibilitychange',()=>{if(document.hidden){this.capture();this.panel?.close();delete this.channels.wolves;this.active='public';this.draw();}else this.sync();});}
  mount(root){
    this.capture();this.root=root;this.generation++;
    if(!root){this.stop();return;}
    if(this.game!==this.context().id){this.game=this.context().id;this.channels={};this.readThrough={};this.drafts={};this.active='public';}
    root.innerHTML='<button type="button" class="chat-launcher" aria-label="開啟聊天室 / Open chat" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-3 2v-7.5A8.5 8.5 0 0 1 10.5 3h2A8.5 8.5 0 0 1 21 11.5Z"/><path d="M7 11h10M7 15h6"/></svg><span>聊天<span lang="en">Chat</span></span><b class="chat-unread" hidden aria-hidden="true"></b></button>';
    root.querySelector('button').onclick=()=>{this.resize?.();this.panel.showModal();this.setExpanded(true);this.draw();void this.sync();};
    if(!this.panel){
      const panel=this.panel=document.createElement('dialog');
      panel.className='chat-overlay';panel.setAttribute('aria-label','遠端文字討論 / Remote text discussion');
      panel.innerHTML='<header class="chat-heading"><div><p class="eyebrow">VOICES IN THE VILLAGE</p><h3>遠端文字討論<span class="english-subtext" lang="en">Remote text discussion</span></h3></div><button type="button" class="chat-close icon-button" aria-label="關閉聊天室 / Close chat" autofocus>×</button></header><div class="chat-tabs"></div><div class="chat-messages" role="log" aria-label="聊天訊息 / Chat messages"></div><form class="chat-form"><label>訊息 · Message<textarea maxlength="500" rows="2" aria-describedby="chat-keyboard-hint"></textarea></label><button class="secondary">發送 · Send</button></form><p class="muted" id="chat-keyboard-hint">Enter 發送 · Shift+Enter 換行<span class="english-subtext" lang="en">Enter to send · Shift+Enter for a new line</span></p><p class="chat-status" role="status"></p>';
      document.body.append(panel);
      this.resize=()=>{const viewport=window.visualViewport;panel.style.setProperty('--chat-viewport-height',`${viewport?.height||window.innerHeight}px`);panel.style.setProperty('--chat-viewport-top',`${viewport?.offsetTop||0}px`);};
      window.visualViewport?.addEventListener('resize',this.resize);window.visualViewport?.addEventListener('scroll',this.resize);this.resize();
      panel.querySelector('.chat-close').onclick=()=>panel.close();
      panel.onclose=()=>{this.capture();this.setExpanded(false);this.root?.querySelector('button')?.focus({preventScroll:true});};
      panel.onclick=event=>{const r=panel.getBoundingClientRect();if(event.target===panel&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))panel.close();};
      const area=panel.querySelector('textarea');
      let composing=false;
      area.addEventListener('compositionstart',()=>{composing=true;});
      area.addEventListener('compositionend',()=>{composing=false;});
      area.addEventListener('keydown',event=>{
        if(event.key!=='Enter'||event.shiftKey||event.isComposing||composing||event.keyCode===229)return;
        event.preventDefault();
        if(!event.repeat&&!area.disabled&&!this.sending)panel.querySelector('form').requestSubmit();
      });
      panel.querySelector('form').onsubmit=async event=>{
        event.preventDefault();const area=panel.querySelector('textarea'),text=area.value.trim(),channel=this.active;
        if(!text||this.sending)return;this.sending=true;
        try{await this.request('',{channel,text});area.value='';this.drafts[channel]='';await this.sync();}
        catch(error){if(panel.isConnected)panel.querySelector('.chat-status').textContent=error.message;}
        finally{this.sending=false;}
      };
    }
    this.setExpanded(this.panel.open);
    if(this.phase!==this.context().phase){for(const c of Object.values(this.channels))c.can_send=false;this.phase=this.context().phase;}
    if(this.context().phase!=='wolves'){delete this.channels.wolves;this.active='public';}
    this.draw();void this.sync();clearInterval(this.timer);this.timer=setInterval(()=>this.sync(),3000);
  }
  setExpanded(open){this.root?.querySelector('button')?.setAttribute('aria-expanded',String(open));}
  capture(){const area=this.panel?.querySelector('textarea');if(area)this.drafts[this.active]=area.value;}
  stop(){clearInterval(this.timer);window.visualViewport?.removeEventListener('resize',this.resize);window.visualViewport?.removeEventListener('scroll',this.resize);this.capture();this.panel?.close();this.panel?.remove();this.panel=null;this.channels={};this.readThrough={};this.root=null;this.generation++;}
  async sync(){
    if(!this.root?.isConnected||!this.context().enabled||document.hidden||this.loading)return;
    const generation=this.generation;this.loading=true;
    const query=new URLSearchParams(Object.entries(this.channels).map(([name,c])=>[`after_${name}`,String(c.messages.at(-1)?.id||0)]));
    try{
      const result=await this.request('?'+query);
      if(generation!==this.generation||!this.root?.isConnected)return;
      this.capture();this.soloDebug=!!result.solo_debug;
      for(const name of Object.keys(this.channels))if(!(name in result.channels)){delete this.channels[name];delete this.drafts[name];delete this.readThrough[name];}
      for(const [name,c] of Object.entries(result.channels)){
        const previous=this.channels[name]?.messages||[];
        this.channels[name]={can_send:c.can_send,messages:[...previous,...c.messages.filter(m=>!previous.some(old=>old.id===m.id))].slice(-100)};
      }
      if(!(this.active in this.channels))this.active='public';
      this.draw();
    }catch(error){if(generation===this.generation&&this.root?.isConnected)this.panel.querySelector('.chat-status').textContent=error.message;}
    finally{this.loading=false;}
  }
  draw(){
    if(!this.panel||!this.root)return;
    if(this.panel.open&&!document.hidden){const latest=this.channels[this.active]?.messages.at(-1)?.id;if(latest)this.readThrough[this.active]=latest;}
    const unread=name=>(this.channels[name]?.messages||[]).filter(message=>message.id>(this.readThrough[name]||0)).length;
    const total=Object.keys(this.channels).reduce((sum,name)=>sum+unread(name),0);
    const badge=this.root.querySelector('.chat-unread');if(badge){badge.hidden=!total;badge.textContent=total>99?'99+':String(total);}
    this.root.querySelector('.chat-launcher')?.setAttribute('aria-label',total?`開啟聊天室，${total} 則未讀訊息 / Open chat, ${total} unread messages`:'開啟聊天室 / Open chat');
    const tabs=this.panel.querySelector('.chat-tabs'),tabHTML=Object.keys(this.channels).map(name=>`<button type="button" class="icon-button" data-channel="${name}" aria-pressed="${this.active===name}">${names[name]}${unread(name)?` <span class="chat-channel-unread">${unread(name)>99?'99+':unread(name)}</span>`:''}</button>`).join('');
    if(tabs.innerHTML!==tabHTML)tabs.innerHTML=tabHTML;
    this.panel.querySelectorAll('[data-channel]').forEach(button=>button.onclick=()=>{this.capture();this.active=button.dataset.channel;this.draw();});
    const channel=this.channels[this.active],messages=this.panel.querySelector('.chat-messages');
    const html=(channel?.messages||[]).map(m=>`<p><strong>${m.alias?esc(m.alias):m.seat===null?'觀眾 · Spectator':`${m.seat} 號 / Seat ${m.seat}`}</strong><span>${esc(m.text)}</span></p>`).join('')||'<p class="muted">還沒有訊息。 · No messages yet.</p>';
    if(messages.innerHTML!==html){const pinned=messages.scrollHeight-messages.scrollTop-messages.clientHeight<40;messages.innerHTML=html;if(pinned)messages.scrollTop=messages.scrollHeight;}
    const area=this.panel.querySelector('textarea');if(area.value!==(this.drafts[this.active]||''))area.value=this.drafts[this.active]||'';area.disabled=!channel?.can_send;
    this.panel.querySelector('form button').disabled=!channel?.can_send;
    this.panel.querySelector('.chat-status').textContent=channel?.can_send?(this.soloDebug&&this.active==='public'?'單人 DEBUG：可隨時測試村莊聊天；玩家加入後恢復正常限制。 · Solo DEBUG: test village chat at any phase. Normal restrictions return when a player joins.':this.active==='wolves'?'僅限存活狼隊可讀。 · Only living wolves can read this channel.':this.active==='spectators'?'僅觀眾與已出局玩家可讀；存活玩家看不到。 · Only spectators and eliminated players can read this chat.':'淘汰玩家可閱讀；輪到遺言時才可發言。 · Eliminated players may read and speak during their last words.'):'目前只可閱讀。 · Read only during this phase.';
  }
}
