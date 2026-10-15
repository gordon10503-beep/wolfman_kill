/** Dawn already announces eyes open; hunter actions resolve in public daylight. */
export function themeForPhase(phase) {
  if (['wolves', 'witch', 'seer'].includes(phase)) return 'night';
  if (['dawn', 'hunter', 'discussion', 'vote', 'runoff', 'finished'].includes(phase)) return 'day';
  return 'lobby';
}

export function narrationChanged(previous, next) {
  return !previous || previous.phase !== next.phase || previous.day !== next.day ||
    (next.phase === 'hunter' && previous.hunter !== next.hunter);
}

export function roleLimit(role, funMode) {
  return funMode ? (role === 'wolf' ? 7 : 15) : ['wolf','villager'].includes(role) ? 12 : 1;
}

const ENGLISH_ROLES = {wolf:'Werewolf', seer:'Seer', witch:'Witch', hunter:'Hunter', villager:'Villager'};
const ENGLISH_DEATHS = {wolf:'Killed at night', poison:'Poisoned', vote:'Voted out', hunter:'Shot by the hunter'};

export function englishSeatText(player, finished) {
  if (!finished) return player.alive ? 'Alive · Role hidden' : 'Eliminated · Role hidden';
  return `${ENGLISH_ROLES[player.role] || 'Unknown role'} · ${player.alive ? 'Alive' : ENGLISH_DEATHS[player.cause] || 'Eliminated'}`;
}
