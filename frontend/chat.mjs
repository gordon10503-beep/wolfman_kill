const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={public:'村莊討論 · Village chat',wolves:'狼隊密談 · Private wolf chat'};

/** Separate cursors keep chat from invalidating private forms or replaying audio. */
export class RoomChat{
  constructor({context,request}){Object.assign(this,{context,request});this.channels={};this.drafts={};this.active='public';this.generation=0;document.addEventListener('visibilitychange',()=>{if(document.hidden){this.capture();delete this.channels.wolves;this.active='public';this.draw();}else this.sync();});}
  mount(root){
    this.capture();this.root=root;this.generation++;
    if(!root){this.stop();return;}
    if(this.game!==this.context().id){this.game=this.context().id;this.channels={};this.drafts={};this.active='public';}
    root.innerHTML='<h3>遠端文字討論<span class="english-subtext" lang="en">Remote text discussion</span></h3><div class="chat-tabs"></div><div class="chat-messages" role="log" aria-label="聊天訊息 / Chat messages"></div><form class="chat-form"><label>訊息 · Message<textarea maxlength="500" rows="2"></textarea></label><button class="secondary">發送 · Send</button></form><p class="chat-status" role="status"></p>';
    root.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const area=root.querySelector('textarea'),text=area.value.trim(),channel=this.active;
      if(!text||this.sending)return;this.sending=true;
      try{await this.request('',{channel,text});area.value='';this.drafts[channel]='';await this.sync();}
      catch(error){if(root.isConnected)root.querySelector('.chat-status').textContent=error.message;}
      finally{this.sending=false;}
    };
    if(this.phase!==this.context().phase){for(const c of Object.values(this.channels))c.can_send=false;this.phase=this.context().phase;}
    if(this.context().phase!=='wolves'){delete this.channels.wolves;this.active='public';}
    this.draw();void this.sync();clearInterval(this.timer);this.timer=setInterval(()=>this.sync(),3000);
  }
  capture(){const area=this.root?.querySelector('textarea');if(area)this.drafts[this.active]=area.value;}
  stop(){clearInterval(this.timer);this.channels={};this.root=null;this.generation++;}
  async sync(){
    if(!this.root?.isConnected||!this.context().enabled||document.hidden||this.loading)return;
    const generation=this.generation;this.loading=true;
    const query=new URLSearchParams(Object.entries(this.channels).map(([name,c])=>[`after_${name}`,String(c.messages.at(-1)?.id||0)]));
    try{
      const result=await this.request('?'+query);
      if(generation!==this.generation||!this.root?.isConnected)return;
      this.capture();
      for(const name of Object.keys(this.channels))if(!(name in result.channels)){delete this.channels[name];delete this.drafts[name];}
      for(const [name,c] of Object.entries(result.channels)){
        const previous=this.channels[name]?.messages||[];
        this.channels[name]={can_send:c.can_send,messages:[...previous,...c.messages.filter(m=>!previous.some(old=>old.id===m.id))].slice(-100)};
      }
      if(!(this.active in this.channels))this.active='public';
      this.draw();
    }catch(error){if(generation===this.generation&&this.root?.isConnected)this.root.querySelector('.chat-status').textContent=error.message;}
    finally{this.loading=false;}
  }
  draw(){
    if(!this.root)return;
    this.root.querySelector('.chat-tabs').innerHTML=Object.keys(this.channels).map(name=>`<button type="button" class="icon-button" data-channel="${name}" aria-pressed="${this.active===name}">${names[name]}</button>`).join('');
    this.root.querySelectorAll('[data-channel]').forEach(button=>button.onclick=()=>{this.capture();this.active=button.dataset.channel;this.draw();});
    const channel=this.channels[this.active],messages=this.root.querySelector('.chat-messages');
    const html=(channel?.messages||[]).map(m=>`<p><strong>${m.seat} 號 / Seat ${m.seat}</strong><span>${esc(m.text)}</span></p>`).join('')||'<p class="muted">還沒有訊息。 · No messages yet.</p>';
    if(messages.innerHTML!==html){const pinned=messages.scrollHeight-messages.scrollTop-messages.clientHeight<40;messages.innerHTML=html;if(pinned)messages.scrollTop=messages.scrollHeight;}
    const area=this.root.querySelector('textarea');if(area.value!==(this.drafts[this.active]||''))area.value=this.drafts[this.active]||'';area.disabled=!channel?.can_send;
    this.root.querySelector('form button').disabled=!channel?.can_send;
    this.root.querySelector('.chat-status').textContent=channel?.can_send?(this.active==='wolves'?'僅限存活狼隊可讀。 · Only living wolves can read this channel.':'淘汰玩家可閱讀；輪到遺言時才可發言。 · Eliminated players may read and speak during their last words.'):'目前只可閱讀。 · Read only during this phase.';
  }
}
