export const englishRoleLabels={wolf:'Werewolf',seer:'Seer',guard:'Guardian',witch:'Witch',hunter:'Hunter',knight:'Knight',gravedigger:'Gravedigger',idiot:'Idiot',villager:'Villager'};
export const roleLabels={wolf:'狼人',seer:'預言家',guard:'守衛',witch:'女巫',hunter:'獵人',knight:'騎士',gravedigger:'守墓人',idiot:'白痴神',villager:'平民'};
export const nightRoles=['witch','seer','guard','gravedigger'];
const sub=(zh,en)=>`${zh}<span class="english-subtext" lang="en">${en}</span>`;
export function extraRoleControls(phase,info,choices){
  if(phase==='guard')return `<h2>${sub('守護今夜','Protect the night')}</h2><p>${sub('可以守護自己或放棄；不能連續兩晚守護同一人。守護只擋狼刀，不能擋毒藥。','Protect yourself or another player, or pass. No consecutive protection of the same seat. Protection blocks wolf kills, never poison.')}</p>${info.previous?`<p class="notice">${sub(`上晚守護：${info.previous} 號`,`Last protected: seat ${info.previous}`)}</p>`:''}<form id="extra-role-form">${choices(info.targets)}<button class="primary">${sub('確認守護','Confirm protection')}</button></form>`;
  if(phase==='gravedigger'){const r=info.grave_result;return `<h2>${sub('墓園的回聲','Echoes from the grave')}</h2><div class="private-role">${r?sub(`${r.seat} 號：${r.alignment==='bad'?'壞人陣營':'好人陣營'}`,`Seat ${r.seat}: ${r.alignment==='bad'?'Bad side':'Good side'}`):sub('前一個白天無人被放逐','No exile on the previous day')}</div><p>${sub('只記錄被投票放逐者；翻牌免死及技能出局不計。','Only a voting exile counts. A spared Idiot or ability elimination does not.')}</p><button class="primary" id="extra-grave-ack">${sub('記住結果並收起','Remember and hide')}</button>`;}
  if(phase==='discussion'){
    const actors=info.actor_seat?[info.actor_seat]:info.knights||[];
    if(!actors.length)return `<p>${sub('沒有可決鬥的騎士。','No knight can duel.')}</p>`;
    return `<h2>${sub('騎士決鬥','Knight’s duel')}</h2><p class="notice">${sub('每局僅一次。命中狼人：狼人出局，立即入夜；選中好人：騎士出局，討論繼續。投票開始後不能決鬥。','Once per game. A wolf target dies and night begins immediately. A good target survives and the knight dies; discussion continues. Duels close when voting starts.')}</p><form id="extra-role-form">${info.actor_seat?`<input type="hidden" name="actor" value="${info.actor_seat}">`:`<label>${sub('翻牌的騎士座位','Knight revealing their role')}<select name="actor">${actors.map(s=>`<option value="${s}">${s} 號 / Seat ${s}</option>`).join('')}</select></label>`}${choices(info.targets.filter(s=>actors.length!==1||s!==actors[0]),false)}<button class="danger">${sub('翻牌並決鬥','Reveal and duel')}</button></form>`;
  }
  return '';
}
export function extraRoleAction(phase){return phase==='guard'?'protect':phase==='gravedigger'?'grave_ack':'duel';}
