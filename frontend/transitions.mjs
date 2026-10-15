import {themeForPhase} from './presentation.mjs';

export function skyChange(previous, next) {
  if (!previous) return null;
  const from = themeForPhase(previous), to = themeForPhase(next);
  return from === 'day' && to === 'night' ? 'night' : from === 'night' && to === 'day' ? 'day' : null;
}

export function shouldSweep(previous, next, starting = false) {
  return (starting && next === 'reveal') || (previous === 'reveal' && next === 'wolves');
}

export async function skySweep(render, destination) {
  if (document.hidden || sessionStorage.getItem('moonfall-forest-motion') === 'off') { render(); return; }
  const app = document.querySelector('#app'), wasInert = app.inert;
  const overlay = document.createElement('div');
  overlay.className = `sky-transition sky-to-${destination}`;
  overlay.setAttribute('aria-hidden','true');
  for (const body of ['sun','moon']) {
    const orb = document.createElement('div'); orb.className = `sky-orb sky-${body}`; overlay.append(orb);
  }
  const label = document.createElement('p'); label.className = 'sky-label';
  label.textContent = destination === 'night' ? '夜幕降臨 · NIGHT FALLS' : '晨光已至 · DAY BREAKS';
  overlay.append(label); document.body.append(overlay); app.inert = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 900)); render();
    await new Promise(resolve => setTimeout(resolve, 1100));
  } finally { overlay.remove(); app.inert = wasInert; }
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
  app.classList.add('wolf-page-changing');
  app.inert = true;
  document.body.append(overlay);
  try {
    await new Promise(resolve => setTimeout(resolve, 750));
    render();
    await new Promise(resolve => setTimeout(resolve, 1050));
  } finally {
    overlay.remove();
    app.classList.remove('wolf-page-changing');
    app.inert = wasInert;
  }
}
