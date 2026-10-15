/** Dawn already announces eyes open; hunter actions resolve in public daylight. */
export function themeForPhase(phase) {
  if (['wolves', 'witch', 'seer'].includes(phase)) return 'night';
  if (['dawn', 'hunter', 'discussion', 'vote', 'runoff', 'finished'].includes(phase)) return 'day';
  return 'lobby';
}
