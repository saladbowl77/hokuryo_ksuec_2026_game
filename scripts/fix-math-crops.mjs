import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const path of ['src/sprite-packs/math.json','docs/math-body-landmarks.json']){
 const old=fs.readFileSync(path,'utf8'),data=JSON.parse(old),annotations=!!data.sheets;
 const crops=annotations?data.sheets[0].crops:data.frames;
 const boundaries=[0,250,492,768];
 crops.forEach((crop,i)=>{const row=Math.floor(i/8),delta=crop[1]-boundaries[row];crop[1]=boundaries[row];crop[3]=boundaries[row+1]-boundaries[row];if(annotations)for(const polygon of data.frames[i])for(const p of polygon.points)p[1]+=delta;});
 if(!annotations)data.animations.crouchAttack.frames=[72,72,75,75,75,78,79,72];
 const content=JSON.stringify(data,null,2);
 const patch=`*** Begin Patch\n*** Update File: ${path}\n@@\n${old.trimEnd().split('\n').map(l=>'-'+l).join('\n')}\n${content.split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch\n`;
 const result=spawnSync('apply_patch',[],{input:patch,encoding:'utf8'});if(result.status!==0)throw new Error(result.stdout+result.stderr);console.log(path);
}
