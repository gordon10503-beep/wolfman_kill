// Host-only timer. No inactive-role status is added to public state or the log.
export class NightCoverTimer {
  constructor({context, readPrivate, pass, onError = () => {}}) {
    Object.assign(this, {context, readPrivate, pass, onError});
    this.key = null;
  }
  reset() { clearTimeout(this.timer); this.key = null; }
  enter() {
    const turn = this.context();
    if (!turn || turn.viewer || !['witch','seer','guard','gravedigger'].includes(turn.phase)) { this.reset(); return; }
    if (turn.key === this.key) return;
    this.reset(); this.key = turn.key; this.deadline = Date.now() + 10000;
    this.timer = setTimeout(() => this.check(), 10000);
  }
  touch() {
    const turn = this.context();
    if (!this.key || turn?.key !== this.key || turn.viewer) return;
    clearTimeout(this.timer); this.deadline = Date.now() + 10000;
    this.timer = setTimeout(() => this.check(), 10000);
  }
  async check() {
    const turn = this.context(), key = this.key;
    if (!turn || !key || turn.key !== key || turn.viewer) return;
    if (Date.now() < this.deadline || turn.hidden) return;
    if (turn.busy) { this.timer = setTimeout(() => this.check(), 500); return; }
    const deadline = this.deadline, checkId = `${key}:${deadline}`;
    if (this.checking === checkId) return;
    this.checking = checkId;
    try {
      const info = await this.readPrivate();
      const current = this.context();
      if (this.key === key && this.deadline === deadline && current?.key === key && current.version === turn.version && !current.busy && !current.hidden && !current.viewer && info.active === false) await this.pass();
    } catch (error) {
      if (this.key === key && this.deadline === deadline) { this.onError(error); this.timer = setTimeout(() => this.check(), 2000); }
    } finally { if(this.checking === checkId)this.checking = null; }
  }
}
