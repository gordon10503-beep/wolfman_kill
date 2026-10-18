// Mount the local illustration as real SVG elements so the page stylesheet can
// animate its layers reliably, including under the app's strict CSP.
const app = document.querySelector('#app');
const illustrations = {};
let motionPreference = sessionStorage.getItem('moonfall-forest-motion');
function updateMotion() {
  const enabled = motionPreference !== 'off';
  app.querySelectorAll('.forest-scene').forEach(scene => scene.classList.toggle('forest-motion-off', !enabled));
  document.querySelectorAll('#motion').forEach(button => {
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '動畫開啟 · Motion on' : '動畫關閉 · Motion off';
    button.title = enabled ? '暫停動畫 / Pause animation' : '播放動畫 / Play animation';
  });
}
const control = document.querySelector('#motion');
control.addEventListener('click', () => {
  motionPreference = control.getAttribute('aria-pressed') === 'true' ? 'off' : 'on';
  sessionStorage.setItem('moonfall-forest-motion', motionPreference);
  updateMotion();
});
updateMotion();
function mountForest() {
  const theme = document.documentElement.dataset.theme;
  const hosts = [...app.querySelectorAll('.hero')];
  hosts.push(...app.querySelectorAll('.game-hero'));
  for (const host of hosts) {
    if (host.querySelector('.forest-scene')) continue;
    const kind = host.classList.contains('game-hero') ? (theme === 'day'?'day':theme==='night'?'night':'lobby') : 'lobby';
    const source=illustrations[kind==='night'?'lobby':kind];
    if (!source) continue;
    const scene = source.cloneNode(true);
    if (kind === 'day') scene.classList.add('day-scene');
    if(kind==='night'){
      scene.classList.add('night-scene');
      // Preserve the painted night forest/wolf silhouettes; layer motion over it.
      [...scene.children].filter(el=>el.localName==='path').forEach(el=>el.remove());
      scene.querySelector('.moon')?.remove();
    }
    scene.classList.add('forest-scene');
    scene.setAttribute('aria-hidden', 'true');
    scene.setAttribute('focusable', 'false');
    if (host.classList.contains('hero') || host.classList.contains('player-scenery')) scene.setAttribute('preserveAspectRatio', 'xMidYMin slice');
    scene.querySelectorAll('.star-field circle').forEach(star => star.setAttribute('r', Math.min(3, Number(star.getAttribute('r')) * 1.7)));
    host.prepend(scene);
    host.classList.add('has-forest-scene');

  }
  updateMotion();
}
// Game screens replace the direct children of #app; no frame loop or subtree polling.
new MutationObserver(mountForest).observe(app, {childList:true});
for (const [kind,path] of Object.entries({lobby:'/assets/forest.svg',day:'/assets/forest-day.svg'})) {
  fetch(path).then(response => {
    if (!response.ok) throw new Error('Forest unavailable');
    return response.text();
  }).then(source => {
    const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
    if (svg.localName !== 'svg') return;
    svg.querySelectorAll('style').forEach(style => style.remove());
    illustrations[kind] = document.importNode(svg, true);
    mountForest();
  }).catch(() => { /* The static CSS background remains available. */ });
}
