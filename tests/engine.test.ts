import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,neutral,RULES,W,characters} from '../src/engine';
import {SerialLines,parseSerialLine} from '../src/protocol';
import {contact,hurtShapes,capsulePolygonOverlap,type BodyPolygon} from '../src/collision';
test('polygon collision handles interior, edge crossing, gaps and mirrored outlines',()=>{
  const body:BodyPolygon={part:'test',ax:0,ay:0,bx:0,by:0,points:[{x:0,y:0},{x:10,y:0},{x:0,y:10}]};
  const point=(x:number,y:number)=>({ax:x,ay:y,bx:x,by:y,r:0,part:'test'});
  assert.equal(capsulePolygonOverlap(point(2,2),body),true);
  assert.equal(capsulePolygonOverlap(point(8,8),body),false);
  assert.equal(capsulePolygonOverlap({...point(-2,5),bx:12},body),true);
  assert.equal(capsulePolygonOverlap(point(0,5),body),true);
  const m=ready(),f=m.fighters[0];
  assert.equal(contact([point(f.x,5)],hurtShapes(f)),undefined,'gap between feet');
  const right=hurtShapes(f);f.dir=-1;const left=hurtShapes(f);
  right.forEach((part,i)=>part.points.forEach((p,j)=>{
    assert.equal(left[i].points[j].x,2*f.x+18-p.x);
    assert.equal(left[i].points[j].y,p.y);
  }));
});
function ready(ids=[1,5]){const m=new Match(ids);m.phase='fight';m.fighters[0].x=900;m.fighters[1].x=970;return m;}
function attack(m:Match,axis=0,air=false){const a=m.fighters[0];a.attack=RULES.startup-1;a.airAttack=air;a.hitDone=false;m.tick([neutral(),{...neutral(),axis}]);}
test('crouch lowers body, ducks high strikes, and stops walking',()=>{
  const m=ready(),f=m.fighters[0],x=f.x;
  const high=[{ax:x-30,ay:110,bx:x+30,by:110,r:4,part:'test'}];
  assert.ok(contact(high,hurtShapes(f)));
  m.tick([{...neutral(),crouch:true,axis:1},neutral()]);
  assert.equal(f.x,x);assert.equal(f.crouching,true);
  assert.equal(contact(high,hurtShapes(f)),undefined);
});
test('only melee fighters slide on down plus attack',()=>{
  for(const id of [1,2,4,5,6]){
    const m=ready([id,id===1?5:1]);
    m.tick([{...neutral(),crouch:true,attack:true},neutral()]);
    assert.equal(m.fighters[0].attackKind,[1,5].includes(id)?'slide':'normal');
  }
});
test('walking uses doubled speeds without altering jump distance',()=>{
  const m=ready(),f=m.fighters[0],x=f.x;
  m.tick([{...neutral(),axis:-1},neutral()]);
  assert.ok(Math.abs(x-f.x-3.84)<1e-8);
  assert.equal(f.character.jumpDistance,32);
});
test('serial accepts one-based numeric keys and strict actions',()=>{
  assert.deepEqual(parseSerialLine('{5:1}'),[{id:5,attack:true}]);
  assert.deepEqual(parseSerialLine('{"1":0,"6":1}'),[{id:1,attack:false},{id:6,attack:true}]);
  for(const s of ['null','[]','broken','{0:1}','{7:1}','{1:2}','{"1":"1"}'])assert.deepEqual(parseSerialLine(s),[]);
});
test('serial handles chunks, multiple lines, CRLF and oversized recovery',()=>{
  const p=new SerialLines();assert.deepEqual(p.push('{5:'),[]);
  assert.deepEqual(p.push('1}\r\n{1:0}\n'),[{id:5,attack:true},{id:1,attack:false}]);
  assert.deepEqual(p.push('x'.repeat(2048)+'{1:1}\n{2:1}\n'),[{id:2,attack:true}]);
});
test('back direction guards and chip cannot KO',()=>{
  const m=ready();m.fighters[1].hp=1;attack(m,1);
  assert.equal(m.fighters[1].hp,1);assert.equal(m.fighters[1].blocked,true);assert.equal(m.phase,'fight');
});
test('first stationary melee hit leaves room for a second hit',()=>{
  const m=ready();attack(m);assert.equal(m.fighters[1].hp,90);assert.ok(m.fighters[1].knock>0&&m.fighters[1].knock<=22);
});
test('air attacks bypass guard and airborne defender cannot guard',()=>{
  let m=ready();attack(m,1,true);assert.equal(m.fighters[1].hp,90);
  m=ready();m.fighters[1].y=20;attack(m,1);assert.equal(m.fighters[1].hp,90);
});
test('attacking fighter cannot guard or move',()=>{
  const m=ready();m.fighters[1].attack=0;const x=m.fighters[1].x;
  attack(m,1);assert.equal(m.fighters[1].hp,90);assert.equal(m.fighters[1].x,x);
});
test('mutual strikes trade rather than privileging player one',()=>{
  const m=ready();m.fighters.forEach(f=>f.attack=RULES.startup-1);
  m.tick([neutral(),neutral()]);assert.deepEqual(m.fighters.map(f=>f.hp),[90,90]);
});
test('two rounds happen even after first-round KO; split wins draw',()=>{
  const m=ready();m.fighters[1].hp=10;attack(m);assert.deepEqual(m.results,[0]);
  for(let n=0;n<150;n++)m.tick([neutral(),neutral()]);assert.equal(m.round,2);assert.equal(m.phase,'intro');
  for(let n=0;n<120;n++)m.tick([neutral(),neutral()]);
  m.fighters[0].hp=50;m.remaining=1;m.tick([neutral(),neutral()]);
  for(let n=0;n<150;n++)m.tick([neutral(),neutral()]);
  assert.equal(m.phase,'finished');assert.deepEqual(m.results,[0,1]);assert.equal(m.winner,null);
});
test('timeouts tie and pause freezes the simulation',()=>{
  const m=ready();m.paused=true;m.tick([{...neutral(),axis:1},neutral()]);assert.equal(m.remaining,3600);
  m.paused=false;m.remaining=1;m.tick([neutral(),neutral()]);assert.deepEqual(m.results,[null]);
});
test('projectiles share global limit and attacks respect cooldown',()=>{
  const m=ready([2,4]);m.fighters[0].x=700;m.fighters[1].x=1200;
  m.projectiles=[{owner:0,x:800,y:60,dir:1,air:false,life:100},{owner:1,x:1100,y:60,dir:-1,air:false,life:100}];
  m.tick([{...neutral(),attack:true},{...neutral(),attack:true}]);assert.equal(m.projectiles.length,2);assert.equal(m.fighters[0].attack,-1);
  m.projectiles=[];m.fighters[0].cooldown=20;m.tick([{...neutral(),attack:true},neutral()]);assert.equal(m.fighters[0].attack,-1);
});
test('camera retains both fighters and facing follows crossing',()=>{
  const m=ready();m.fighters[0].x=28;m.fighters[1].x=1800;m.tick([neutral(),neutral()]);
  for(const f of m.fighters)assert.ok(f.x>=m.camera&&f.x<=m.camera+W);
  m.fighters[0].x=1000;m.fighters[1].x=900;m.tick([neutral(),neutral()]);assert.deepEqual(m.fighters.map(f=>f.dir),[-1,1]);
});
test('mirror matches and unavailable characters rejected',()=>{
  assert.throws(()=>new Match([1,1]));assert.throws(()=>new Match([1,3]));
});
test('every available fighter clears the whole opponent and switches sides',()=>{
  for(const c of characters.filter(c=>c.available)) {
    const m=ready([c.id,c.id===1?5:1]);
    m.fighters[1].x=1000;
    m.tick([{axis:1,jump:true,attack:false},neutral()]);
    assert.equal(m.fighters[0].takeoff,RULES.takeoff);
    let peak=0,crossHeight=0,crossed=false;
    for(let n=0;n<90;n++) {
      const before=m.fighters[0].x<m.fighters[1].x;
      m.tick([neutral(),neutral()]);peak=Math.max(peak,m.fighters[0].y);
      if(before&&m.fighters[0].x>=m.fighters[1].x){crossHeight=m.fighters[0].y;crossed=true;}
    }
    assert.ok(peak>RULES.bodyHeight,`${c.key} height`);
    assert.ok(crossed,`${c.key} crosses`);assert.ok(crossHeight>=RULES.bodyHeight,`${c.key} clears head`);
    assert.equal(m.fighters[0].y,0);assert.equal(m.fighters[0].dir,-1);
  }
});
test('neutral jump stays vertical; backward jump records a distinct pose',()=>{
  const m=ready();const x=m.fighters[0].x;
  m.tick([{...neutral(),jump:true},neutral()]);
  for(let n=0;n<75;n++)m.tick([neutral(),neutral()]);assert.equal(m.fighters[0].x,x);
  m.tick([{axis:-1,jump:true,attack:false},neutral()]);assert.equal(m.fighters[0].jumpKind,'backJump');
});
test('two stationary melee hits connect, third whiffs at close and tip range, including corners',()=>{
  for(const id of [1,5])for(const corner of [false,true])for(const facing of [1,-1])for(const distance of [48,55,60]) {
    const m=ready([id,id===1?5:1]);
    m.fighters[1].x=corner?(facing===1?1892:28):960;
    m.fighters[0].x=m.fighters[1].x-facing*distance;
    for(const expected of [90,80,80]){
      attack(m);assert.equal(m.fighters[1].hp,expected,`${id} distance=${distance} facing=${facing} corner=${corner}`);
      for(let n=0;n<60;n++)m.tick([neutral(),neutral()]);
    }
  }
});
test('moving to close the gap starts a fresh two-hit exchange',()=>{
  const m=ready();attack(m);for(let n=0;n<60;n++)m.tick([neutral(),neutral()]);
  assert.equal(m.fighters[0].stationaryHits,1);
  m.tick([{...neutral(),axis:1},neutral()]);assert.equal(m.fighters[0].stationaryHits,0);
  attack(m);assert.equal(m.fighters[0].stationaryHits,1);
});
