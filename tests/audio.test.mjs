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
test('room audio supplies its main-device lease and stays silent when disabled',async()=>{
  const {ctx,clips}=setup();ctx.session.speaker='main-device-id';const headers=[];
  globalThis.fetch=async(url,options)=>{headers.push(options.headers);return response();};
  await narrator.speak();
  assert.equal(headers[0]['X-Moonfall-Speaker'],'main-device-id');
  ctx.enabled=false;narrator.stop();await narrator.speak();
  assert.equal(headers.length,1);assert.equal(clips[0].playing,false);
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

test('changing speech language uses a separate cache and returns to the Cantonese cache',async()=>{
  const {ctx}=setup();const urls=[];
  ctx.state.narration_en='Everyone, close your eyes.';
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();ctx.language='en';await narrator.speak();ctx.language='yue';await narrator.speak();
  assert.equal(urls.length,2);assert.match(urls[0],/lang=yue/);assert.match(urls[1],/lang=en/);
});
test('English fallback uses translated text and an English voice',async()=>{
  const {ctx,spoken}=setup();ctx.language='en';ctx.state.narration_en='Everyone, close your eyes.';
  globalThis.fetch=async()=>({ok:false});globalThis.speechSynthesis.getVoices=()=>[{lang:'zh-HK'},{lang:'en-US'}];
  await narrator.speak();assert.equal(spoken[0].lang,'en-US');assert.equal(spoken[0].text,ctx.state.narration_en);
});

function morning(ctx, key='1:2,4') {
  ctx.state={phase:'hunter',narration:'獵人請決定是否開槍。',narration_en:'Hunter, decide whether to shoot.',
    morning_report:{day:Number(key.split(':')[0]),key,zh:'昨晚 2 號、4 號 出局。',en:'Eliminated last night: seats 2, 4.'}};
}
test('morning report plays once before instructions, while explicit replay reuses its clip',async()=>{
  const {ctx,clips}=setup();morning(ctx);const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();assert.match(urls[0],/morning=1/);
  clips.at(-1).playing=false;clips.at(-1).onended();
  await narrator.speak();assert.doesNotMatch(urls[1],/morning=/);
  await narrator.speak({replay:true});assert.equal(urls.length,2);
  assert.equal(clips.filter(c=>c.playing).length,1);
});
test('an already-started morning report does not repeat when the instruction is interrupted',async()=>{
  const {ctx,clips}=setup();morning(ctx);const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();narrator.stop();await narrator.speak();
  assert.equal(urls.length,2);assert.equal(narrator.morningSpoken.size,1);
  assert.doesNotMatch(urls[1],/morning=/);
  clips.at(-1).playing=false;clips.at(-1).onended();
  morning(ctx,'2:2,4');await narrator.speak();
  assert.equal(urls.length,3);assert.match(urls[2],/morning=2/);
});

test('a hunter shot and its replay cannot repeat the earlier peaceful-night announcement',async()=>{
  const {ctx}=setup();morning(ctx);ctx.state.phase='discussion';ctx.state.morning_report.zh='昨晚是平安夜。';const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak();narrator.stop();ctx.state.phase='hunter';ctx.state.hunter=4;
  await narrator.speak();await narrator.speak({replay:true});
  assert.match(urls[0],/morning=1/);assert.equal(urls.length,2);assert.doesNotMatch(urls[1],/morning=/);
});

test('joining or unmuting during a later hunter turn does not announce an old peaceful night',async()=>{
  const {ctx}=setup();morning(ctx);ctx.state.hunter=4;ctx.state.morning_report.cue='discussion::';const urls=[];
  globalThis.fetch=async url=>{urls.push(url);return response();};
  await narrator.speak({replay:true});assert.doesNotMatch(urls[0],/morning=/);
});

test('volume changes update the active clip without another request or playback',async()=>{
  const {ctx,clips}=setup();ctx.volume=.35;let requests=0;
  globalThis.fetch=async()=>{requests++;return response();};
  await narrator.speak();assert.equal(clips[0].volume,.35);
  narrator.setVolume(0);assert.equal(clips[0].volume,0);assert.equal(requests,1);
});
test('English fallback reads public morning results before the phase instruction',async()=>{
  const {ctx,spoken}=setup();morning(ctx);ctx.language='en';
  globalThis.fetch=async()=>({ok:false});globalThis.speechSynthesis.getVoices=()=>[{lang:'en-US'}];
  await narrator.speak();
  assert.equal(spoken[0].text,'Eliminated last night: seats 2, 4. Hunter, decide whether to shoot.');
  spoken[0].onend();assert.equal(narrator.morningSpoken.size,1);
});
test('muting a pending morning report prevents playback without marking it as announced',async()=>{
  const {ctx,clips,spoken}=setup();morning(ctx);let finish;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const loading=narrator.speak();ctx.enabled=false;narrator.stop();finish(response());await loading;
  assert.equal(clips.length,0);assert.equal(spoken.length,0);assert.equal(narrator.morningSpoken.size,0);
});

test('winning teams have separate cached clips across games, and replay reuses the correct result',async()=>{
  const {ctx}=setup();let requests=0;
  globalThis.fetch=async()=>{requests++;return response();};
  ctx.state={phase:'finished',winner:'village',narration:'好人陣營勝利！'};
  await narrator.speak();ctx.state={...ctx.state,winner:'wolves',narration:'狼人陣營勝利！'};
  await narrator.speak();await narrator.speak({replay:true});
  assert.equal(requests,2);
});


test('public role announcements cannot reuse a prefetched generic cue or another event',async()=>{
  const {ctx}=setup();const urls=[];globalThis.fetch=async url=>{urls.push(url);return response();};
  ctx.state={phase:'discussion',narration:'Discuss'};await narrator.speak();
  ctx.state={phase:'discussion',narration:'Knight 2 loses. Discuss',public_cue:'1:discussion:9:knight2'};
  await narrator.speak();await narrator.speak({replay:true});
  assert.equal(urls.length,2);assert.match(urls[1],/announcement=/);
  ctx.state={phase:'discussion',narration:'Knight 3 loses. Discuss',public_cue:'1:discussion:10:knight3'};
  await narrator.speak();assert.equal(urls.length,3);
});
