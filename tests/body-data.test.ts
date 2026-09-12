import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,neutral} from '../src/engine';
import {bodyData,imagePoint,imageTransform} from '../src/body-data';
import {animationFrame,syncPose} from '../src/animation';
import {hurtShapes} from '../src/collision';
import {spriteDefinitions as sprites} from '../src/sprite-registry';

test('every playable image and every non-KO animation frame has body data',()=>{
 for(const id of [1,2,4,5,6]){
  const f=new Match([id,id===1?5:1]).fighters[0];assert.ok(hurtShapes(f).length);
 }
 for(const [key,sprite]of Object.entries(sprites))for(const [state,animation]of Object.entries(sprite.animations)){
  if(state==='ko')continue;
  for(const frame of animation.frames)assert.ok(bodyData[key].frames[frame],`${key}:${state}:${frame}`);
 }
 for(const data of Object.values(bodyData))for(const parts of Object.values(data.frames))for(const p of parts){
  assert.ok(p.points.length>=3);
  for(const [x,y]of p.points){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(x>=0&&y>=0&&x<=data.width&&y<=data.height);}
 }
});
test('individual sprites retain distinct body heights within their image bounds',()=>{
 const heights=[1,2,4,5,6].map(id=>{const f=new Match([id,id===1?5:1]).fighters[0];return Math.max(...hurtShapes(f).flatMap(p=>p.points.map(p=>p.y)));});
 assert.ok(heights.every(height=>height>0&&height<192));
 assert.ok(new Set(heights.map(Math.round)).size>=4);
});
test('sprite and body transforms agree for scale, origin, flip and hurt rotation',()=>{
 for(const id of [1,2,4,5,6])for(const dir of [1,-1])for(const crouching of [true,false]){
  const f=new Match([id,id===1?5:1]).fighters[0];f.dir=dir;f.crouching=crouching;f.stun=5;
  const t=imageTransform(f),p=[t.width*.6,t.height*.4],v=imagePoint(f,p);
  const px=(dir<0?t.width-p[0]:p[0])-t.originX,py=p[1]-t.originY,a=t.angle*Math.PI/180;
  assert.equal(v.x,f.x+px*t.scaleX*Math.cos(a)-py*t.scaleY*Math.sin(a));
  assert.equal(v.y,f.y-t.offsetY-px*t.scaleX*Math.sin(a)-py*t.scaleY*Math.cos(a));
 }
});
test('walking body frame follows fixed animation clock, not distance',()=>{
 const f=new Match([1,5]).fighters[0];f.walking=true;syncPose(f);const start=animationFrame(f);
 f.walkDistance=10000;assert.equal(animationFrame(f),start);
 f.age+=6;assert.notEqual(animationFrame(f),start);
 assert.notDeepEqual(bodyData.science.frames[start],bodyData.science.frames[animationFrame(f)]);
});
test('KO plays once, holds its last frame, pauses, and has no hurtbox',()=>{
 const m=new Match([1,5]),f=m.fighters[0];m.phase='roundEnd';m.phaseTimer=150;f.hp=0;
 assert.equal(animationFrame(f),88);assert.deepEqual(hurtShapes(f),[]);
 for(let i=0;i<65;i++)m.tick([neutral(),neutral()]);assert.equal(animationFrame(f),95);
 const age=f.koAge;m.paused=true;m.tick([neutral(),neutral()]);assert.equal(f.koAge,age);
});
