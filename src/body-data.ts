import science from './hurtboxes/science.json';
import math from './hurtboxes/math.json';
import social from './hurtboxes/social.json';
import english from './hurtboxes/english.json';
import pe from './hurtboxes/pe.json';
import type {Fighter} from './engine';
import {spriteDefinitions} from './sprite-registry';
export type BodyData={width:number;height:number;origin:number[];displayHeight:number;offsetY:number;frames:Record<string,{part:string;points:number[][]}[]>};
export const bodyData:Record<string,BodyData>={science,math,social,english,pe};
export function imageTransform(f:Fighter){
 const data=bodyData[f.character.key];
 if(!data)throw new Error(`Missing body data: ${f.character.key}`);
 const animated=!!spriteDefinitions[f.character.key];
 return {width:data.width,height:data.height,originX:data.origin[0],originY:data.origin[1],scaleX:data.displayHeight/data.height,scaleY:(!animated&&f.crouching?85:data.displayHeight)/data.height,offsetY:data.offsetY,angle:f.hp===0?(animated?0:f.dir*75):f.stun&&!f.blocked?-f.dir*9:0};
}
// Phaser flipX reflects texture pixels around the texture center, not its custom origin.
export function imagePoint(f:Fighter,p:number[]){
 const t=imageTransform(f),px=f.dir<0?t.width-p[0]:p[0];
 const x=(px-t.originX)*t.scaleX,y=(p[1]-t.originY)*t.scaleY;
 const a=t.angle*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
 return {x:f.x+x*cos-y*sin,y:f.y-t.offsetY-x*sin-y*cos};
}
