/** One audio owner: cancellation invalidates every pending fetch and callback. */
export class Narrator {
  generation = 0; controller = null; audio = null; url = null; watchdog = null;
  constructor({context, status}) { this.context = context; this.status = status; }
  stop() {
    this.generation++; this.controller?.abort(); this.controller = null;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    globalThis.speechSynthesis?.cancel(); clearTimeout(this.watchdog);
  }
  async speak() {
    this.stop();
    const {enabled, state, session} = this.context();
    if (!enabled || !state || !session) return;
    const generation = this.generation, text = state.narration;
    this.status('正在準備廣東話語音…');
    const controller = new AbortController(); this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/games/${session.id}/audio`, {headers:{Authorization:`Bearer ${session.token}`},signal:controller.signal});
      if (!response.ok) throw new Error('Speech unavailable');
      const blob = await response.blob();
      if (generation !== this.generation || !this.context().enabled) return;
      this.url = URL.createObjectURL(blob); this.audio = new Audio(this.url);
      this.audio.onended = () => { if (generation === this.generation) { this.status('語音播放完畢'); this.stop(); } };
      this.audio.onerror = () => { if (generation === this.generation) this.fallback(text, generation); };
      await this.audio.play();
      // A stopped/replaced clip may finish its play promise after the next clip.
      if (generation !== this.generation) return;
      this.status('正在播放 · 廣東話');
      this.watchdog = setTimeout(() => { if (generation === this.generation) { this.stop(); this.status('語音已停止，請參閱字幕'); } }, 45000);
    } catch {
      if (generation === this.generation && this.context().enabled) this.fallback(text, generation);
    } finally { clearTimeout(timeout); }
  }
  fallback(text, generation) {
    if (generation !== this.generation || !this.context().enabled) return;
    clearTimeout(this.watchdog);
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    const synth = globalThis.speechSynthesis;
    const selected = synth?.getVoices().find(v => /zh[-_]HK|yue/i.test(v.lang));
    if (!synth || !selected) { this.status('語音暫時不可用 · 請參閱字幕'); return; }
    synth.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.voice = selected; utterance.lang = selected.lang;
    utterance.onend = () => { if (generation === this.generation) { clearTimeout(this.watchdog); this.status('本機語音播放完畢'); } };
    utterance.onerror = () => { if (generation === this.generation) { clearTimeout(this.watchdog); this.status('請參閱字幕 · 語音未能播放'); } };
    synth.speak(utterance); this.status('正在播放 · 本機廣東話');
    this.watchdog = setTimeout(() => { if (generation === this.generation) { this.stop(); this.status('請參閱字幕'); } }, 45000);
  }
}
