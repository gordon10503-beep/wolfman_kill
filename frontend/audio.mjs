/** Playback is exclusive; public audio blobs and in-flight loads are reusable. */
const NEXT = {reveal:['wolves'], wolves:['hidden_wolf','wolf_beauty','witch'], hidden_wolf:['wolf_beauty','witch'],wolf_beauty:['witch'], witch:['seer'], seer:['guard','gravedigger','dawn'], guard:['gravedigger','dawn'], gravedigger:['dawn'],
  dawn:['discussion','last_words'], hunter:['discussion','wolves','last_words'],wolf_king_shot:['discussion','wolves','last_words'], last_words:['discussion','wolves'], discussion:['vote'],
  vote:['wolves','runoff'], runoff:['wolves']};
const VOICES = {original:'原版廣東話神經女聲', narrator:'廣東話神經男聲'};
const ENGLISH_VOICES = {original:'English neural female', narrator:'English neural male'};
const cueKey=(phase,report,winner,announcement)=>`${phase}${winner?`:winner:${winner}`:''}${report?`:morning:${report.key}`:''}${announcement?`:event:${announcement}`:''}`;

export class Narrator {
  generation = 0; audio = null; url = null; watchdog = null;
  cache = new Map(); pending = new Map(); failures = new Map(); requests = new Map(); cacheEpoch = 0;
  morningSpoken = new Set();
  morningCue = new Map();
  constructor({context, status}) { this.context = context; this.status = status; }
  stop() {
    this.generation++;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    globalThis.speechSynthesis?.cancel(); this.utterance=null;clearTimeout(this.watchdog);
    // Pending loads finish into cache; stopping playback never forces re-synthesis.
  }
  dispose() {
    this.stop(); this.cacheEpoch++;
    for(const [controller, timer] of this.requests) { clearTimeout(timer); controller.abort(); }
    this.requests.clear(); this.cache.clear(); this.pending.clear(); this.failures.clear(); this.morningSpoken.clear(); this.morningCue.clear();
  }
  setVolume(value) { const volume=Math.min(1,Math.max(0,Number(value)||0));if(this.audio)this.audio.volume=volume;if(this.utterance)this.utterance.volume=volume; }
  key(phase, profile, text, language='yue') { return `${language}:${profile}:${phase || text}`; }
  async clip(session, phase, profile, text='', language='yue', report=null, winner=null, announcement=null) {
    const key = this.key(cueKey(phase,report,winner,announcement), profile, text, language);
    if(this.cache.has(key)) return this.cache.get(key);
    if(this.pending.has(key)) return this.pending.get(key);
    if((this.failures.get(key) || 0) > Date.now()) return null;
    const epoch = this.cacheEpoch, controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),15000);
    this.requests.set(controller,timeout);
    const task = (async()=>{
      try {
        const query = new URLSearchParams({voice:profile,lang:language});
        if(phase) query.set('phase',phase);
        if(report)query.set('morning',String(report.day));
        if(announcement)query.set('announcement',announcement);
        const response = await fetch(`/api/games/${session.id}/audio?${query}`, {
          headers:{Authorization:`Bearer ${session.token}`,...(session.speaker?{'X-Moonfall-Speaker':session.speaker}:{})}, signal:controller.signal});
        if(!response.ok) throw new Error('Speech unavailable');
        const blob = await response.blob();
        if(epoch !== this.cacheEpoch) return null;
        this.cache.set(key,blob);
        if(this.cache.size > 48) this.cache.delete(this.cache.keys().next().value);
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
  prefetch(session, phase, profile, language='yue') {
    if(this.context().preload === false) return;
    for(const next of (NEXT[phase] || []).filter(p=>!['guard','gravedigger','hidden_wolf','wolf_beauty'].includes(p)||this.context().state?.role_counts?.[p])) void this.clip(session,next,profile,'',language);
  }
  async speak({replay=false}={}) {
    this.stop();
    const {enabled, state, session, profile='original', language='yue'} = this.context();
    if(!enabled || !state || !session) return;
    const generation = this.generation, reportKey=`${session.id}:${state.morning_report?.key}`;
    const cue=`${state.phase}:${state.hunter??''}:${state.last_words_seat??''}`;
    const eligible=state.morning_report && (!state.morning_report.cue || state.morning_report.cue===cue);
    const report=eligible && (!this.morningSpoken.has(reportKey) || (replay && this.morningCue.get(reportKey)===cue))?state.morning_report:null;
    const text=(report?report[language==='en'?'en':'zh']+' ':'')+(language==='en' ? state.narration_en : state.narration);
    const winner=state.phase==='finished'?state.winner:null;
    const cachePhase=cueKey(state.phase,report,winner,state.public_cue);
    const complete=()=>{if(report){this.morningSpoken.add(reportKey);this.morningCue.set(reportKey,cue);}};
    this.status(this.cache.has(this.key(cachePhase,profile,text,language))?'使用已快取語音…':language==='en'?'Preparing English neural audio…':'正在準備廣東話神經語音…');
    const blob = await this.clip(session,state.phase,profile,text,language,report,winner,state.public_cue);
    if(generation !== this.generation || !this.context().enabled) return;
    if(!blob) { this.fallback(text,generation,complete); return; }
    this.prefetch(session,state.phase,profile,language);
    try {
      this.url = URL.createObjectURL(blob); this.audio = new Audio(this.url);
      this.setVolume(this.context().volume??1);
      this.audio.onended = ()=>{ if(generation === this.generation) { complete();this.status('神經語音播放完畢 · 重播已快取'); this.stop(); } };
      this.audio.onerror = ()=>{
        if(generation === this.generation) { this.cache.delete(this.key(cachePhase,profile,text,language)); this.fallback(text,generation,complete); }
      };
      await this.audio.play();
      if(generation !== this.generation) return;
      complete(); // An interrupted instruction must not repeat the already-started morning report.
      this.status(`正在播放 · ${(language==='en'?ENGLISH_VOICES:VOICES)[profile]} · 重播無需下載`);
      this.watchdog = setTimeout(()=>{ if(generation === this.generation) { this.stop(); this.status('語音已停止，請參閱字幕'); } },45000);
    } catch(error) {
      if(generation !== this.generation) return;
      if(error.name === 'NotAllowedError') { this.stop(); this.status('語音已備妥，請再按重播以允許播放'); }
      else this.fallback(text,generation,complete);
    }
  }
  fallback(text, generation, complete=()=>{}) {
    if(generation !== this.generation || !this.context().enabled) return;
    clearTimeout(this.watchdog);
    if(this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if(this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    if(this.context().allowFallback === false) {
      this.status('神經語音暫時未能連線 · 未切換本機聲線，請參閱字幕'); return;
    }
    const synth = globalThis.speechSynthesis;
    const english = this.context().language === 'en';
    const selected = synth?.getVoices().find(v=>english ? /^en([-_]|$)/i.test(v.lang) : /zh[-_]HK|yue/i.test(v.lang));
    if(!synth || !selected) { this.status('語音暫時不可用 · 請參閱字幕'); return; }
    synth.cancel(); const utterance = new SpeechSynthesisUtterance(text); this.utterance=utterance; utterance.voice = selected; utterance.lang = selected.lang;utterance.volume=this.context().volume??1;
    utterance.onend = ()=>{ if(generation === this.generation) { complete();clearTimeout(this.watchdog); this.status('本機備用語音播放完畢（並非原版神經聲線）'); } };
    utterance.onerror = ()=>{ if(generation === this.generation) { clearTimeout(this.watchdog); this.status('請參閱字幕 · 語音未能播放'); } };
    synth.speak(utterance); complete();this.status(`正在播放 · 本機備用${english?'英語':'廣東話'}（並非原版神經聲線）`);
    this.watchdog = setTimeout(()=>{ if(generation === this.generation) { this.stop(); this.status('請參閱字幕'); } },45000);
  }
}
