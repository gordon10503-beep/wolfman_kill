import {roleLabels,englishRoleLabels,wolfRoles} from './new-roles.mjs';
/** Dawn already announces eyes open; hunter actions resolve in public daylight. */
export function themeForPhase(phase) {
  if (['wolves', 'witch', 'seer', 'guard', 'gravedigger','hidden_wolf','wolf_beauty'].includes(phase)) return 'night';
  if (['dawn', 'hunter', 'wolf_king_shot', 'last_words', 'discussion', 'vote', 'runoff', 'finished'].includes(phase)) return 'day';
  return 'lobby';
}

export function narrationChanged(previous, next) {
  return !previous || previous.phase !== next.phase || previous.day !== next.day ||
    previous.role_turn?.number !== next.role_turn?.number || previous.public_cue !== next.public_cue ||
    (['hunter','wolf_king_shot'].includes(next.phase) && previous.hunter !== next.hunter) ||
    (next.phase === 'last_words' && previous.last_words_seat !== next.last_words_seat);
}

export function roleLimit(role, funMode) {
  return funMode ? (wolfRoles.includes(role) ? 7 : 15) : ['wolf','villager'].includes(role) ? 12 : 1;
}

const ENGLISH_ROLES = englishRoleLabels;
const ENGLISH_DEATHS = {charm:'Died from charm',explosion:'Eliminated in an explosion',duel:'Eliminated in a knight duel',wolf:'Killed at night', poison:'Poisoned', vote:'Voted out', hunter:'Shot by the hunter'};
const CHINESE_DEATHS = {charm:'因魅惑連鎖出局',explosion:'自爆技能出局',duel:'騎士決鬥出局',wolf:'夜晚出局', poison:'被毒殺', vote:'公投出局', hunter:'被獵人帶走'};

function hunterSeat(player, events) {
  if (Number.isInteger(player.hunter_seat) && player.hunter_seat > 0) return player.hunter_seat;
  // Older saved games recorded the shooter only in the chronicle.
  for (const event of events) {
    const shot = event.text.match(/^獵人 (\d+) 號開槍，(\d+) 號出局。$/);
    if (shot && Number(shot[2]) === player.seat) return Number(shot[1]);
  }
  return null;
}

export function chineseDeathText(player, events = []) {
  const hunter = player.cause === 'hunter' ? hunterSeat(player, events) : null;
  return hunter ? `被${player.shooter_role==='wolf_king'?'狼王':'獵人'} ${hunter} 號帶走` : CHINESE_DEATHS[player.cause] || '已出局';
}

export function englishSeatText(player, finished, events = []) {
  if (!finished) return `${player.revealed_role ? `${ENGLISH_ROLES[player.revealed_role]}${player.can_vote===false?' (no vote)':''} · ` : ''}${player.alive ? 'Alive' : 'Eliminated'}${player.revealed_role ? '' : ' · Role hidden'}`;
  const hunter = player.cause === 'hunter' ? hunterSeat(player, events) : null;
  const death = hunter ? `Shot by ${player.shooter_role==='wolf_king'?'Wolf King':'hunter'} ${hunter}` : ENGLISH_DEATHS[player.cause] || 'Eliminated';
  return `${ENGLISH_ROLES[player.role] || 'Unknown role'} · ${player.alive ? 'Alive' : death}`;
}

export function chineseSeatText(player, finished, events = []) {
  if (finished) return `${roleLabels[player.role]} · ${player.alive?'存活':chineseDeathText(player,events)}`;
  return player.revealed_role ? `${roleLabels[player.revealed_role]}${player.can_vote===false?'（無投票權）':''} · ${player.alive?'存活':'已出局'}` : player.alive?'身份未公開':'已出局 · 身份未公開';
}
