import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {Narrator} from '../frontend/audio.mjs';

const originals = {fetch:globalThis.fetch, Audio:globalThis.Audio, speechSynthesis:globalThis.speechSynthesis, SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};
let narrator;
afterEach(()=>{narrator?.stop();Object.assign(globalThis,originals);});
function setup() {
  const clips=[], statuses=[], spoken=[];
  const ctx={enabled:true,state:{narration:'天黑請閉眼'},session:{id:'test',token:'test'}};
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

test('replay cancels the prior clip before starting another',async()=>{
  const {clips}=setup();globalThis.fetch=async()=>response();
  await narrator.speak();await narrator.speak();
  assert.equal(clips.length,2);assert.equal(clips[0].playing,false);assert.equal(clips[1].playing,true);
});
test('a late fetch from the previous phase can never start playback',async()=>{
  const {clips}=setup();let resolveOld;
  globalThis.fetch=()=>new Promise(resolve=>{resolveOld=resolve;});
  const old=narrator.speak();
  globalThis.fetch=async()=>response();await narrator.speak();
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
