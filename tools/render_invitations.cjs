const sharp=require('sharp');
const path=require('node:path');
const root=path.resolve(__dirname,'../frontend/assets/invitations');
(async()=>{
  for(const ratio of ['9x16','3x4']){
    const source=path.join(root,`moonfall-invite-${ratio}.svg`);
    const target=path.join(root,`moonfall-invite-${ratio}.png`);
    const info=await sharp(source).png().toFile(target);
    console.log(`${path.basename(target)}: ${info.width} x ${info.height}`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
