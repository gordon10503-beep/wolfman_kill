/** Playback is exclusive; public audio blobs and in-flight loads are reusable. */
const NEXT = {reveal:['wolves'], wolves:['witch'], witch:['seer'], seer:['dawn'],
  dawn:['discussion'], hunter:['discussion','wolves'], discussion:['vote'],
  vote:['wolves','runoff'], runoff:['wolves']};
const VOICES = {original:'原版廣東話神經女聲', narrator:'廣東話神經男聲'};

export class Narrator {
  generation = 0; audio = null; url = null; watchdog = null;
  cache = new Map(); pending = new Map(); failures = new Map(); requests = new Map(); cacheEpoch = 0;
  constructor({context, status}) { this.context = context; this.status = status; }
  stop() {
    this.generation++;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    globalThis.speechSynthesis?.cancel(); clearTimeout(this.watchdog);
    // Pending loads finish into cache; stopping playback never forces re-synthesis.
  }
  dispose() {
    this.stop(); this.cacheEpoch++;
    for(const [controller, timer] of this.requests) { clearTimeout(timer); controller.abort(); }
    this.requests.clear(); this.cache.clear(); this.pending.clear(); this.failures.clear();
  }
  key(phase, profile, text) { return `${profile}:${phase || text}`; }
  async clip(session, phase, profile, text='') {
    const key = this.key(phase, profile, text);
    if(this.cache.has(key)) return this.cache.get(key);
    if(this.pending.has(key)) return this.pending.get(key);
    if((this.failures.get(key) || 0) > Date.now()) return null;
    const epoch = this.cacheEpoch, controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),15000);
    this.requests.set(controller,timeout);
    const task = (async()=>{
      try {
        const query = new URLSearchParams({voice:profile});
        if(phase) query.set('phase',phase);
        const response = await fetch(`/api/games/${session.id}/audio?${query}`, {
          headers:{Authorization:`Bearer ${session.token}`}, signal:controller.signal});
        if(!response.ok) throw new Error('Speech unavailable');
        const blob = await response.blob();
        if(epoch !== this.cacheEpoch) return null;
        this.cache.set(key,blob);
        if(this.cache.size > 24) this.cache.delete(this.cache.keys().next().value);
        this.failures.delete(key);
        return blob;
      } catch {
        if(epoch === this.cacheEpoch) this.failures.set(key,Date.now()+30000);
        return null;
      } finally { clearTimeout(timeout); this.requests.delete(controller); }
    })();
    this.pending.set(key,task);
    try { return await task; }
    finally { if(this.pending.get(key) === task) this.pending.delete(key); }
  }
  prefetch(session, phase, profile) {
    if(this.context().preload === false) return;
    for(const next of NEXT[phase] || []) void this.clip(session,next,profile);
  }
  async speak() {
    this.stop();
    const {enabled, state, session, profile='original'} = this.context();
    if(!enabled || !state || !session) return;
    const generation = this.generation, text = state.narration;
    this.status(this.cache.has(this.key(state.phase,profile,text))?'使用已快取語音…':'正在準備廣東話神經語音…');
    const blob = await this.clip(session,state.phase,profile,text);
    if(generation !== this.generation || !this.context().enabled) return;
    if(!blob) { this.fallback(text,generation); return; }
    this.prefetch(session,state.phase,profile);
    try {
      this.url = URL.createObjectURL(blob); this.audio = new Audio(this.url);
      this.audio.onended = ()=>{ if(generation === this.generation) { this.status('神經語音播放完畢 · 重播已快取'); this.stop(); } };
      this.audio.onerror = ()=>{
        if(generation === this.generation) { this.cache.delete(this.key(state.phase,profile,text)); this.fallback(text,generation); }
      };
      await this.audio.play();
      if(generation !== this.generation) return;
      this.status(`正在播放 · ${VOICES[profile]} · 重播無需下載`);
      this.watchdog = setTimeout(()=>{ if(generation === this.generation) { this.stop(); this.status('語音已停止，請參閱字幕'); } },45000);
    } catch(error) {
      if(generation !== this.generation) return;
      if(error.name === 'NotAllowedError') { this.stop(); this.status('語音已備妥，請再按重播以允許播放'); }
      else this.fallback(text,generation);
    }
  }
  fallback(text, generation) {
    if(generation !== this.generation || !this.context().enabled) return;
    clearTimeout(this.watchdog);
    if(this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if(this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    if(this.context().allowFallback === false) {
      this.status('神經語音暫時未能連線 · 未切換本機聲線，請參閱字幕'); return;
    }
    const synth = globalThis.speechSynthesis;
    const selected = synth?.getVoices().find(v=>/zh[-_]HK|yue/i.test(v.lang));
    if(!synth || !selected) { this.status('語音暫時不可用 · 請參閱字幕'); return; }
    synth.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.voice = selected; utterance.lang = selected.lang;
    utterance.onend = ()=>{ if(generation === this.generation) { clearTimeout(this.watchdog); this.status('本機備用語音播放完畢（並非原版神經聲線）'); } };
    utterance.onerror = ()=>{ if(generation === this.generation) { clearTimeout(this.watchdog); this.status('請參閱字幕 · 語音未能播放'); } };
    synth.speak(utterance); this.status('正在播放 · 本機備用廣東話（並非原版神經聲線）');
    this.watchdog = setTimeout(()=>{ if(generation === this.generation) { this.stop(); this.status('請參閱字幕'); } },45000);
  }
}
