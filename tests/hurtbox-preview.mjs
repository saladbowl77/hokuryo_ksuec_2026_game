import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:1536,height:384}});
 await page.goto('http://127.0.0.1:5173/');
 for(let start=0;start<88;start+=16){
  await page.evaluate(async start=>{
   const {loadAllSprites}=await import('/src/assets.ts');const {science}=await loadAllSprites();
   const {bodyData}=await import('/src/body-data.ts');
   document.body.replaceChildren();document.body.style.cssText='margin:0;transform:none;width:1536px;height:384px';
   const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=384;document.body.append(canvas);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#394953';ctx.fillRect(0,0,1536,384);
   science.slice(start,start+16).forEach((frame,i)=>{const x=i%8*192,y=Math.floor(i/8)*192;ctx.drawImage(frame,x,y);ctx.fillStyle='white';ctx.font='12px monospace';ctx.fillText(String(start+i),x+3,y+12);
    for(const part of bodyData.science.frames[start+i]??[]){ctx.beginPath();part.points.forEach(([px,py],j)=>j?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.closePath();ctx.strokeStyle='#ff6060';ctx.lineWidth=.7;ctx.stroke();}
   });
  },start);
  await page.locator('canvas').screenshot({path:`test-results/hurtbox-overlay-${start}.png`});
 }
}finally{await browser.close();}
