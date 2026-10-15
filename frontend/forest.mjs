// Mount the local illustration as real SVG elements so the page stylesheet can
// animate its layers reliably, including under the app's strict CSP.
const app = document.querySelector('#app');
let illustration;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionPreference = sessionStorage.getItem('moonfall-forest-motion');
function updateMotion() {
  const enabled = motionPreference === null ? !reducedMotion.matches : motionPreference === 'on';
  app.querySelectorAll('.forest-scene').forEach(scene => scene.classList.toggle('forest-motion-off', !enabled));
  app.querySelectorAll('.forest-motion-control').forEach(button => {
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '動畫開啟 · Motion on' : '啟用動畫 · Enable motion';
    button.title = enabled ? '暫停動畫 / Pause animation' : '播放動畫 / Play animation';
  });
}
reducedMotion.addEventListener('change', updateMotion);
function mountForest() {
  if (!illustration) return;
  const hosts = [...app.querySelectorAll('.hero')];
  if (document.documentElement.dataset.theme === 'lobby') hosts.push(...app.querySelectorAll('.game-hero'));
  for (const host of hosts) {
    if (host.querySelector('.forest-scene')) continue;
    const scene = illustration.cloneNode(true);
    scene.classList.add('forest-scene');
    scene.setAttribute('aria-hidden', 'true');
    scene.setAttribute('focusable', 'false');
    if (host.classList.contains('hero')) scene.setAttribute('preserveAspectRatio', 'xMidYMin slice');
    scene.querySelectorAll('.star-field circle').forEach(star => star.setAttribute('r', Math.min(3, Number(star.getAttribute('r')) * 1.7)));
    host.prepend(scene);
    host.classList.add('has-forest-scene');
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'icon-button forest-motion-control';
    control.addEventListener('click', () => {
      motionPreference = control.getAttribute('aria-pressed') === 'true' ? 'off' : 'on';
      sessionStorage.setItem('moonfall-forest-motion', motionPreference);
      updateMotion();
    });
    host.append(control);
  }
  updateMotion();
}
// Game screens replace the direct children of #app; no frame loop or subtree polling.
new MutationObserver(mountForest).observe(app, {childList:true});
fetch('/assets/forest.svg').then(response => {
  if (!response.ok) throw new Error('Forest unavailable');
  return response.text();
}).then(source => {
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  if (svg.localName !== 'svg') return;
  svg.querySelectorAll('style').forEach(style => style.remove());
  illustration = document.importNode(svg, true);
  mountForest();
}).catch(() => { /* The original static CSS background remains available. */ });
