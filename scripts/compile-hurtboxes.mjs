import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';

// Compile per-frame source annotations using the same chroma key and registration
// as the game loader. This writes reviewable JSON, never a shared body template.
const keys=process.argv.slice(2);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto(process.env.GAME_URL??'http://127.0.0.1:5175/');
 for(const key of keys){
  const path=`src/hurtboxes/${key}.json`,annotations=JSON.parse(fs.readFileSync(`docs/${key}-body-landmarks.json`,'utf8'));
  await page.goto(process.env.GAME_URL??'http://127.0.0.1:5175/',{waitUntil:'networkidle'});
  const output=await page.evaluate(async({key,annotations})=>{
   const frames={};
   for(const sheet of annotations.sheets){
    const image=new Image();image.src=sheet.source;await image.decode();
    for(const [index,[x,y,w,h,anchor]]of sheet.crops.entries()){
     const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,w,h);
     const {data}=ctx.getImageData(0,0,w,h);let bottom=0;
     for(let i=0;i<data.length;i+=4){const [r,g,b,a]=data.slice(i,i+4);if(a&&!(r>160&&b>140&&g<110&&r-g>90&&b-g>70))bottom=Math.max(bottom,Math.floor(i/4/w));}
     const tx=Math.round(87-anchor*sheet.scale),ty=Math.round(184-bottom*sheet.scale),frame=sheet.firstFrame+index;
     if(!annotations.frames[frame])throw new Error(`Missing ${key} body annotation ${frame}`);
     frames[frame]=annotations.frames[frame].map(({part,points})=>({part,points:points.map(([px,py])=>[Math.round((tx+px*sheet.scale)*100)/100,Math.round((ty+py*sheet.scale)*100)/100])}));
    }
   }
   return {version:1,source:`docs/${key}-body-landmarks.json`,space:'rendered-image-pixels',width:192,height:192,origin:[87,184],displayHeight:192,offsetY:5,annotation:annotations.annotation,frames};
  },{key,annotations});
  const old=fs.existsSync(path)?fs.readFileSync(path,'utf8'):null;
  if(annotations.append&&old)output.frames={...JSON.parse(old).frames,...output.frames};
  const content=JSON.stringify(output,null,2)+'\n';
  const patch=old===null?`*** Begin Patch\n*** Add File: ${path}\n${content.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch\n`:`*** Begin Patch\n*** Update File: ${path}\n@@\n${old.trimEnd().split('\n').map(l=>'-'+l).join('\n')}\n${content.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch\n`;
  const result=spawnSync('apply_patch',[],{input:patch,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr+result.stdout);
  console.log(`${key}: compiled ${Object.keys(output.frames).length} frame annotations`);
 }
}finally{await browser.close();}
