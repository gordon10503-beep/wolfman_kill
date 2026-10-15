export function shouldSweep(previous, next, starting = false) {
  return (starting && next === 'reveal') || (previous === 'reveal' && next === 'wolves');
}

/** Swap the screen beneath a brief CSS-driven wolf crossing. */
export async function wolfSweep(render) {
  if (document.hidden || sessionStorage.getItem('moonfall-forest-motion') === 'off') {
    render();
    return;
  }
  const app = document.querySelector('#app');
  const wasInert = app.inert;
  const overlay = document.createElement('div');
  overlay.className = 'wolf-transition';
  overlay.setAttribute('aria-hidden', 'true');
  const curtain = document.createElement('div');
  curtain.className = 'wolf-curtain';
  const wolf = document.createElement('img');
  wolf.src = '/assets/wolf-silhouette.svg';
  wolf.alt = '';
  wolf.className = 'wolf-runner';
  overlay.append(curtain, wolf);
  app.inert = true;
  document.body.append(overlay);
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    render();
    await new Promise(resolve => setTimeout(resolve, 700));
  } finally {
    overlay.remove();
    app.inert = wasInert;
  }
}
