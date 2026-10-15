// Installation is optional. Gameplay and private screens always use the network.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
let prompt;
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  prompt=event;
  const button=document.querySelector('#install-app');
  button.hidden=false;
  button.onclick=async()=>{
    if(!prompt)return;
    await prompt.prompt();
    await prompt.userChoice;
    prompt=null;button.hidden=true;
  };
});
window.addEventListener('appinstalled',()=>{
  prompt=null;
  document.querySelector('#install-app').hidden=true;
});
