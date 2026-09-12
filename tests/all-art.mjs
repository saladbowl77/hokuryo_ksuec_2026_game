import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const url=process.env.GAME_URL??'http://127.0.0.1:5175/';
try{
 const page=await browser.newPage({viewport:{width:1536,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#start:not([disabled])').waitFor({timeout:60000});
 await page.click('#review-tab');
 assert.equal(await page.locator('#review-character option').count(),5);
 for(const key of ['science','math','social','pe','english']){
  await page.selectOption('#review-character',key);await page.check('#review-body');
  for(const button of await page.locator('[data-motion]').all()){
   await button.click();await page.locator('#frame').fill(await page.locator('#frame').getAttribute('max'));await page.waitForTimeout(20);
  }
  await page.screenshot({path:`test-results/review-${key}.jpg`,type:'jpeg',quality:65});
 }
 await page.click('#select-tab');await page.click('#start');
 await page.waitForFunction(()=>window.__hokuryo?.scene?.graphics);
 for(const id of [1,2,4,5,6]){
  const result=await page.evaluate(async id=>{
   const {animationFrame,syncPose}=await import('/src/animation.ts');
   const {hurtShapes}=await import('/src/collision.ts');
   const {spriteDefinitions}=await import('/src/sprite-registry.ts');
   const scene=window.__hokuryo.scene,states=['idle','forward','backward','crouch','guard','hit','attack','airAttack','ko'];
   const checks=[];
   for(const state of states){
    scene.startMatch([id,id===1?5:1]);const m=scene.match;m.phase='fight';m.paused=true;
    const f=m.fighters[0];f.x=850;m.fighters[1].x=1100;
    if(state==='forward'||state==='backward'){f.walking=true;f.backing=state==='backward';}
    if(state==='crouch')f.crouching=true;
    if(state==='guard'||state==='hit'){f.stun=state==='guard'?8:12;f.blocked=state==='guard';}
    if(state==='attack'||state==='airAttack'){f.attack=13;f.airAttack=state==='airAttack';if(f.airAttack)f.y=100;}
    if(state==='ko'){f.hp=0;f.koAge=70;}
    syncPose(f);scene.draw();
    const frame=animationFrame(f),texture=scene.sprites[0].texture.key;
    checks.push({state,frame,texture,valid:texture===`${f.character.key}-${frame}`&&scene.textures.exists(texture)&&!!spriteDefinitions[f.character.key],body:state==='ko'?hurtShapes(f).length===0:hurtShapes(f).length>0});
   }
   scene.startMatch([id,id===1?5:1]);scene.match.phase='fight';scene.match.paused=true;scene.debug=true;scene.draw();
   return checks;
  },id);
  assert.ok(result.every(r=>r.valid&&r.body),JSON.stringify(result));
  await page.screenshot({path:`test-results/fighter-${id}.jpg`,type:'jpeg',quality:70});
 }
 assert.deepEqual(errors,[]);
 const gallery=await browser.newPage({viewport:{width:1536,height:384}});await gallery.goto(url);
 for(const key of ['science','math','social','pe','english']){
  await gallery.evaluate(async key=>{
   const {loadAllSprites,spriteDefinitions}=await import('/src/assets.ts');const {bodyData}=await import('/src/body-data.ts');
   const frames=(await loadAllSprites())[key],def=spriteDefinitions[key];
   document.body.replaceChildren();document.body.style.cssText='margin:0;width:1536px;height:384px;transform:none';
   const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=384;document.body.append(canvas);const ctx=canvas.getContext('2d');
   ctx.fillStyle='#344553';ctx.fillRect(0,0,1536,384);
   const states=['idle','forward','backward','guard','crouch','hit','jump','landing','attack','airAttack','slide','crouchAttack','crouchGuard','ko'];
   states.forEach((state,i)=>{const anim=def.animations[state];if(!anim)return;const frame=anim.frames[state==='ko'?anim.frames.length-1:Math.floor(anim.frames.length/2)],x=i%8*192,y=Math.floor(i/8)*192;ctx.drawImage(frames[frame],x,y);ctx.fillStyle='white';ctx.font='11px monospace';ctx.fillText(`${key} ${state} #${frame}`,x+2,y+12);
    if(state!=='ko')for(const p of bodyData[key].frames[frame]){ctx.beginPath();p.points.forEach(([px,py],i)=>i?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.closePath();ctx.lineWidth=.6;ctx.strokeStyle='#ff7269';ctx.stroke();}
   });
  },key);
  await gallery.locator('canvas').screenshot({path:`test-results/atlas-${key}.jpg`,type:'jpeg',quality:75});
 }
 console.log('All five characters: motion viewer, texture/body correspondence, KO, runtime and galleries passed.');
}finally{await browser.close();}
