// Installation is optional. Gameplay and private screens always use the network.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
let prompt;
export function refreshInstallButton(){
  const button=document.querySelector('#install-app');
  if(button)button.hidden=!prompt;
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();prompt=event;refreshInstallButton();
});
// Delegation survives guide content being rebuilt when switching DEBUG on/off.
document.addEventListener('click',async event=>{
  if(!event.target.closest?.('#install-app')||!prompt)return;
  const active=prompt;
  await active.prompt();await active.userChoice;
  if(prompt===active)prompt=null;
  refreshInstallButton();
});
window.addEventListener('appinstalled',()=>{prompt=null;refreshInstallButton();});
