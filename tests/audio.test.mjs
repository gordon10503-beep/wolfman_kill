import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {Narrator} from '../frontend/audio.mjs';

const originals = {fetch:globalThis.fetch, Audio:globalThis.Audio, speechSynthesis:globalThis.speechSynthesis, SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};
let narrator;
afterEach(()=>{narrator?.dispose();Object.assign(globalThis,originals);});
function setup() {
  const clips=[], statuses=[], spoken=[];
  const ctx={enabled:true,preload:false,state:{phase:'wolves',narration:'天黑請閉眼'},session:{id:'test',token:'test'}};
  globalThis.Audio=class {
    constructor(url){this.url=url;this.playing=false;clips.push(this);}
    async play(){this.playing=true;assert.equal(clips.filter(c=>c.playing).length,1);}
    pause(){this.playing=false;}
    removeAttribute(){} load(){}
  };
  globalThis.speechSynthesis={cancel(){spoken.length=0;},getVoices(){return [{lang:'zh-HK'}];},speak(u){spoken.push(u);}};
  globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  narrator=new Narrator({context:()=>ctx,status:s=>statuses.push(s)});
  return {ctx,clips,statuses,spoken};
}
const response=()=>({ok:true,blob:async()=>new Blob(['mp3'])});

test('replay uses the cached blob with zero additional requests and no overlap',async()=>{
  const {clips}=setup();let requests=0;globalThis.fetch=async()=>{requests++;return response();};
  await narrator.speak();await narrator.speak();
  assert.equal(clips.length,2);assert.equal(clips[0].playing,false);assert.equal(clips[1].playing,true);
  assert.equal(requests,1);
});
test('a late fetch from the previous phase can never start playback',async()=>{
  const {clips,ctx}=setup();let resolveOld;
  globalThis.fetch=()=>new Promise(resolve=>{resolveOld=resolve;});
  const old=narrator.speak();
  ctx.state.phase='witch';globalThis.fetch=async()=>response();await narrator.speak();
  resolveOld(response());await old;
  assert.equal(clips.length,1);assert.equal(clips[0].playing,true);
});
test('muting during synthesis prevents late audio and fallback',async()=>{
  const {clips,ctx,spoken}=setup();let finish;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const pending=narrator.speak();ctx.enabled=false;narrator.stop();finish(response());await pending;
  assert.equal(clips.length,0);assert.equal(spoken.length,0);
});
test('failed synthesis falls back only to a Cantonese voice',async()=>{
  const {spoken,clips}=setup();globalThis.fetch=async()=>({ok:false});
  await narrator.speak();assert.equal(clips.length,0);assert.equal(spoken.length,1);assert.equal(spoken[0].lang,'zh-HK');
  narrator.stop();assert.equal(spoken.length,0);
});
test('no Cantonese voice leaves readable text without wrong-language speech',async()=>{
  const {spoken,statuses}=setup();globalThis.fetch=async()=>({ok:false});globalThis.speechSynthesis.getVoices=()=>[{lang:'en-US'}];
  await narrator.speak();assert.equal(spoken.length,0);assert.match(statuses.at(-1),/字幕/);
});

test('replay while loading shares the existing request',async()=>{
  const {clips}=setup();let resolve,requests=0;
  globalThis.fetch=()=>{requests++;return new Promise(done=>{resolve=done;});};
  const first=narrator.speak(),second=narrator.speak();
  assert.equal(requests,1);resolve(response());await Promise.all([first,second]);
  assert.equal(clips.length,1);assert.equal(clips[0].playing,true);
});
test('muted pending audio is retained for the next replay',async()=>{
  const {clips,ctx}=setup();let finish,requests=0;
  globalThis.fetch=()=>{requests++;return new Promise(done=>{finish=done;});};
  const loading=narrator.speak();ctx.enabled=false;narrator.stop();finish(response());await loading;
  ctx.enabled=true;await narrator.speak();assert.equal(clips.length,1);assert.equal(requests,1);
});
test('original voice does not silently become a robotic local voice',async()=>{
  const {ctx,spoken,statuses}=setup();ctx.allowFallback=false;let requests=0;
  globalThis.fetch=async()=>{requests++;return {ok:false};};
  await narrator.speak();await narrator.speak();
  assert.equal(spoken.length,0);assert.equal(requests,1);assert.match(statuses.at(-1),/未切換本機聲線/);
});
test('voice profiles use separate caches',async()=>{
  const {ctx}=setup();const urls=[];globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();ctx.profile='narrator';await narrator.speak();ctx.profile='original';await narrator.speak();
  assert.equal(urls.length,2);assert.match(urls[0],/voice=original/);assert.match(urls[1],/voice=narrator/);
});
test('next public cue preloads and is reused after a phase transition',async()=>{
  const {ctx}=setup();ctx.preload=true;const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();await Promise.all(narrator.pending.values());
  assert.equal(urls.filter(url=>url.includes('phase=witch')).length,1);
  ctx.state.phase='witch';await narrator.speak();await Promise.all(narrator.pending.values());
  assert.equal(urls.filter(url=>url.includes('phase=witch')).length,1);
});
