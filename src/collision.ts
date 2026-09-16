import type { Fighter } from './engine';
import {animationFrame} from './animation';
import {bodyData,imagePoint} from './body-data';
import {spriteDefinitions as manifest} from './sprite-registry';

export type Capsule={ax:number;ay:number;bx:number;by:number;r:number;part:string};
export type Point={x:number;y:number};
export type BodyPolygon={points:Point[];part:string;ax:number;ay:number;bx:number;by:number};
type Segment=[number,number,number,number,number,string];
function world(f:Fighter,parts:Segment[]):Capsule[]{
  return parts.map(([ax,ay,bx,by,r,part])=>({ax:f.x+ax*f.dir,ay:f.y+ay,bx:f.x+bx*f.dir,by:f.y+by,r,part}));
}
export function hurtShapes(f:Fighter):BodyPolygon[]{
  if(f.hp===0)return [];
  const data=bodyData[f.character.key],frame=animationFrame(f);
  const parts=data?.frames[String(frame)];
  if(!parts)throw new Error(`Missing body polygons: ${f.character.key} frame ${frame}`);
  return parts.map(({part,points:vertices})=>{
    const points=vertices.map(p=>imagePoint(f,p));
    const ax=points.reduce((sum,p)=>sum+p.x,0)/points.length;
    const ay=points.reduce((sum,p)=>sum+p.y,0)/points.length;
    return {part,points,ax,ay,bx:ax,by:ay};
  });
}
export function stationaryPush(attacker:Fighter,defender:Fighter):number{
  // Reserve reach against the actual neutral body, including every idle frame.
  const idle=manifest[defender.character.key]?.animations.idle;
  const samples=idle?.frames.map((_,i)=>i*idle.ticksPerFrame)??[0];
  const direction=defender.x>=attacker.x?1:-1;
  let allowance=0;
  for(let distance=1;distance<=22;distance++){
    const reaches=samples.every(age=>contact(attackShapes(attacker),hurtShapes({...defender,x:defender.x+direction*distance,stun:0,blocked:false,attack:-1,walking:false,crouching:false,poseState:'idle',poseStarted:0,age})));
    if(!reaches)break;
    allowance=distance;
  }
  return allowance/2;
}
export function attackShapes(f:Fighter):Capsule[]{
  const range=f.character.attackRange*9.6;
  if(f.attackKind==='slide')return world(f,[[12,17,range+5,17,9,'slide']]);
  if(f.airAttack)return world(f,[[12,57,range*.85,-20,12,'air-strike']]);
  return world(f,[[12,100,range,100,4,'weapon']]);
}
function pointDistance(x:number,y:number,s:Capsule){
  const dx=s.bx-s.ax,dy=s.by-s.ay,length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((x-s.ax)*dx+(y-s.ay)*dy)/length)):0;
  return Math.hypot(x-s.ax-t*dx,y-s.ay-t*dy);
}
export function capsulesOverlap(a:Capsule,b:Capsule):boolean{
  const adx=a.bx-a.ax,ady=a.by-a.ay,bdx=b.bx-b.ax,bdy=b.by-b.ay;
  const cross=adx*bdy-ady*bdx;
  if(Math.abs(cross)>1e-8){
    const dx=b.ax-a.ax,dy=b.ay-a.ay;
    const t=(dx*bdy-dy*bdx)/cross,u=(dx*ady-dy*adx)/cross;
    if(t>=0&&t<=1&&u>=0&&u<=1)return true;
  }
  return Math.min(pointDistance(a.ax,a.ay,b),pointDistance(a.bx,a.by,b),pointDistance(b.ax,b.ay,a),pointDistance(b.bx,b.by,a))<=a.r+b.r;
}
function inside(x:number,y:number,points:Point[]):boolean{
  let result=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)result=!result;
  }
  return result;
}
export function capsulePolygonOverlap(attack:Capsule,body:BodyPolygon):boolean{
  if(inside(attack.ax,attack.ay,body.points)||inside(attack.bx,attack.by,body.points))return true;
  return body.points.some((a,i)=>{
    const b=body.points[(i+1)%body.points.length];
    return capsulesOverlap(attack,{ax:a.x,ay:a.y,bx:b.x,by:b.y,r:0,part:body.part});
  });
}
export function contact(attacks:Capsule[],body:BodyPolygon[]):BodyPolygon|undefined{
  return body.find(part=>attacks.some(attack=>capsulePolygonOverlap(attack,part)));
}
