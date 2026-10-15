/** Dawn already announces eyes open; hunter actions resolve in public daylight. */
export function themeForPhase(phase) {
  if (['wolves', 'witch', 'seer'].includes(phase)) return 'night';
  if (['dawn', 'hunter', 'last_words', 'discussion', 'vote', 'runoff', 'finished'].includes(phase)) return 'day';
  return 'lobby';
}

export function narrationChanged(previous, next) {
  return !previous || previous.phase !== next.phase || previous.day !== next.day ||
    (next.phase === 'hunter' && previous.hunter !== next.hunter) ||
    (next.phase === 'last_words' && previous.last_words_seat !== next.last_words_seat);
}

export function roleLimit(role, funMode) {
  return funMode ? (role === 'wolf' ? 7 : 15) : ['wolf','villager'].includes(role) ? 12 : 1;
}

const ENGLISH_ROLES = {wolf:'Werewolf', seer:'Seer', witch:'Witch', hunter:'Hunter', villager:'Villager'};
const ENGLISH_DEATHS = {wolf:'Killed at night', poison:'Poisoned', vote:'Voted out', hunter:'Shot by the hunter'};
const CHINESE_DEATHS = {wolf:'夜晚出局', poison:'被毒殺', vote:'公投出局', hunter:'被獵人帶走'};

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
  return hunter ? `被獵人 ${hunter} 號帶走` : CHINESE_DEATHS[player.cause] || '已出局';
}

export function englishSeatText(player, finished, events = []) {
  if (!finished) return player.alive ? 'Alive · Role hidden' : 'Eliminated · Role hidden';
  const hunter = player.cause === 'hunter' ? hunterSeat(player, events) : null;
  const death = hunter ? `Shot by hunter ${hunter}` : ENGLISH_DEATHS[player.cause] || 'Eliminated';
  return `${ENGLISH_ROLES[player.role] || 'Unknown role'} · ${player.alive ? 'Alive' : death}`;
}
