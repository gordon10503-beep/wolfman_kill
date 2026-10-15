// Mount the local illustration as real SVG elements so the page stylesheet can
// animate its layers reliably, including under the app's strict CSP.
const app = document.querySelector('#app');
let illustration;
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
    host.prepend(scene);
    host.classList.add('has-forest-scene');
  }
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
