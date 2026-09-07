import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:800,height:420}});
  await page.goto('http://127.0.0.1:5173/');
  const edges=await page.evaluate(async()=>{
    const {loadAllSprites,spriteDefinitions}=await import('/src/assets.ts');
    const sprites=await loadAllSprites();
    const sheet=spriteDefinitions.science.extraSheets.find(s=>s.source.includes('walk-v2'));
    const img=new Image();img.src=sheet.source;await img.decode();
    const edges=sheet.frames.slice(8).map(([x,y,w,h])=>{
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');ctx.drawImage(img,x,y,w,h,0,0,w,h);
      const {data}=ctx.getImageData(0,0,w,h);
      let count=0;
      for(let row=0;row<h;row++)for(const col of [0,w-1]){
        const i=(row*w+col)*4,[r,g,b]=data.slice(i,i+3);
        if(data[i+3]&&!(r>160&&b>140&&g<110&&r-g>90&&b-g>70))count++;
      }
      return count;
    });
    document.body.replaceChildren();
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
    document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.fillStyle='#25383f';ctx.fillRect(0,0,768,384);
    sprites.science.slice(56,64).forEach((frame,i)=>ctx.drawImage(frame,(i%4)*192,Math.floor(i/4)*192));
    return edges;
  });
  assert.deepEqual(edges,Array(8).fill(0),'No body pixels touch either crop edge');
  await page.screenshot({path:'test-results/backward-crops.png'});
  console.log('All eight backward crops have clear side margins.');
} finally {await browser.close();}
