import data from './character_stats.json';
import {attackShapes,hurtShapes,contact,stationaryPush} from './collision';
import {syncPose} from './animation';

export type Character = typeof data[number];
export const characters: Character[] = data;
export const W = 960, H = 540, FLOOR = 480, WORLD = W * 2;
export const RULES = { hp: 100, damage: 10, chip: 1, startup: 10, active: 5, recovery: 19, cooldown: 30, hitstun: 17, blockstun: 10, hitstop: 5, duration: 3600, knockback:80, guardPush:22, bodyHeight:156, takeoff:4, landing:6 };
export type Input = { axis: number; jump: boolean; attack: boolean; crouch?:boolean; step?: number };
export const neutral = (): Input => ({axis:0,jump:false,attack:false});
export type Fighter = {
  poseState:string;poseStarted:number;koAge:number;
  character: Character; x:number; y:number; vx:number; vy:number; dir:number; hp:number; stationaryHits:number; crouching:boolean; attackKind:'normal'|'slide'; walkDistance:number;
  attack:number; cooldown:number; stun:number; blocked:boolean; walking:boolean; backing:boolean;
  hitDone:boolean; airAttack:boolean; knock:number; age:number; takeoff:number; landing:number; jumpAxis:number; jumpKind:'jump'|'forwardJump'|'backJump'; airFrames:number;
};
export type Projectile = {owner:number; x:number; y:number; dir:number; air:boolean; life:number};
export type Effect = {x:number;y:number;blocked:boolean;life:number};
export type Phase = 'intro'|'fight'|'roundEnd'|'finished';
const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));
export class Match {
  fighters: Fighter[];
  projectiles: Projectile[]=[];
  effects: Effect[]=[];
  round=1; results:(number|null)[]=[]; remaining=RULES.duration;
  phase:Phase='intro'; phaseTimer=120; paused=false; freeze=0; camera=W/2; frame=0;
  constructor(public ids:number[]) {
    if(ids.length!==2 || ids[0]===ids[1]) throw new Error('異なる2キャラを選択してください');
    this.fighters=ids.map((id,i)=>{
      const character=characters.find(c=>c.id===id && c.available);
      if(!character) throw new Error('使用できないキャラです');
      return {poseState:'idle',poseStarted:0,koAge:0,character,x:WORLD/2+(i?130:-130),y:0,vx:0,vy:0,dir:i?-1:1,hp:100,stationaryHits:0,crouching:false,attackKind:'normal',walkDistance:0,attack:-1,cooldown:0,stun:0,blocked:false,walking:false,backing:false,hitDone:false,airAttack:false,knock:0,age:0,takeoff:0,landing:0,jumpAxis:0,jumpKind:'jump',airFrames:0};
    });
  }
  get winner():number|null {
    const wins=[0,0]; for(const r of this.results) if(r!==null) wins[r]++;
    return wins[0]===wins[1]?null:wins[0]>wins[1]?0:1;
  }
  nextRound() {
    const fresh=new Match(this.ids); this.fighters=fresh.fighters;
    this.projectiles=[];this.effects=[];this.round=2;this.remaining=RULES.duration;
    this.phase='intro';this.phaseTimer=120;this.freeze=0;this.camera=W/2;
  }
  tick(inputs:Input[]) {
    if(this.paused || this.phase==='finished') return;
    this.frame++;
    if(this.phase!=='fight') {
      this.fighters.forEach(f=>{if(f.hp===0){f.koAge++;f.y=Math.max(0,f.y-8);}});
      if(--this.phaseTimer<=0) {
        if(this.phase==='intro') this.phase='fight';
        else if(this.round===1) this.nextRound(); else this.phase='finished';
      }
      return;
    }
    if(this.freeze>0) {this.freeze--;return;}
    this.remaining--;
    this.effects=this.effects.filter(e=>--e.life>0);
    this.fighters.forEach((f,i)=>{
      const input=inputs[i]??neutral(), other=this.fighters[1-i];
      if(other.x!==f.x) f.dir=other.x>f.x?1:-1;
      f.age++;f.cooldown=Math.max(0,f.cooldown-1);f.walking=false;
      f.backing=input.axis*f.dir<0;
      if(f.stun>0) {f.stun--;f.attack=-1;f.takeoff=0;f.landing=0;}
      else if(f.landing>0) f.landing--;
      else if(f.takeoff>0) {
        if(--f.takeoff===0){
          const time=f.character.jumpSpeed*60,height=f.character.jumpHeight*H/100;
          f.vy=2*height/time;f.vx=f.jumpAxis*f.character.jumpDistance*W/100/(2*time);f.airFrames=0;
        }
      }
      else {
        f.blocked=false;
        if(f.attack>=0) {
          if(++f.attack>=RULES.startup+RULES.active+RULES.recovery) f.attack=-1;
          else if(f.attackKind==='slide'&&f.attack>=RULES.startup&&f.attack<RULES.startup+RULES.active+5)f.x+=f.dir*4;
        }
        else {
          f.crouching=!!input.crouch&&f.y===0;
          if(f.y===0) {
            const step=f.crouching?0:input.axis*f.character.moveSpeed*W/100/60;
            const from=f.x;f.x=clamp(f.x+step,28,WORLD-28);
            f.walkDistance+=Math.abs(f.x-from);f.walking=f.x!==from;
            if(f.walking||input.jump)this.fighters.forEach(fighter=>fighter.stationaryHits=0);
            if(input.jump&&!f.crouching) {
              f.takeoff=RULES.takeoff;f.jumpAxis=input.axis;
              f.jumpKind=input.axis===0?'jump':input.axis*f.dir>0?'forwardJump':'backJump';
            }
          }
          if(input.attack && f.takeoff===0 && f.cooldown===0 && (f.character.type==='melee'||this.projectiles.length<2)) {
            f.attackKind=f.crouching&&f.character.type==='melee'?'slide':'normal';
            f.attack=0;f.cooldown=RULES.cooldown;f.hitDone=false;f.airAttack=f.y>0||f.vy>0;
            if(f.attackKind==='slide')this.fighters.forEach(fighter=>fighter.stationaryHits=0);
          }
        }
      }
      if(f.knock!==0) {
        const amount=Math.sign(f.knock)*Math.min(Math.abs(f.knock),W/100);
        const target=clamp(f.x+amount,28,WORLD-28),unused=f.x+amount-target;
        f.x=target;f.knock-=amount;
        other.x=clamp(other.x-unused,28,WORLD-28);
      }
      if(f.y>0||f.vy>0) {
        f.airFrames++;
        f.x+=f.vx;f.y+=f.vy;
        f.vy-=2*(f.character.jumpHeight*H/100)/(f.character.jumpSpeed*60)**2;
        if(f.y<=0){f.y=0;f.vy=0;f.vx=0;f.landing=RULES.landing;}
      }
      f.x=clamp(f.x,28,WORLD-28);
    });
    // Ground pushboxes prevent walking through; airborne fighters can cross sides.
    const [a,b]=this.fighters, gap=Math.abs(a.x-b.x);
    if(gap<48&&Math.abs(a.y-b.y)<RULES.bodyHeight) {
      const sign=b.x>=a.x?1:-1, push=(48-gap)/2;
      a.x=clamp(a.x-sign*push,28,WORLD-28);b.x=clamp(b.x+sign*push,28,WORLD-28);
    }
    if(Math.abs(a.x-b.x)>W-90) {
      const mid=(a.x+b.x)/2,sign=b.x>a.x?1:-1;
      a.x=mid-sign*(W-90)/2;b.x=mid+sign*(W-90)/2;
    }
    for(const [i,f] of this.fighters.entries()) {
      f.dir=this.fighters[1-i].x>=f.x?1:-1;
    }
    this.fighters.forEach(syncPose);
    // Collect both melee contacts before applying damage so trades are possible.
    const hits:{owner:number;air:boolean;x:number;y:number}[]=[];
    this.fighters.forEach((f,i)=>{
      if(f.attack<RULES.startup||f.attack>=RULES.startup+RULES.active||f.hitDone) return;
      if(f.character.type==='ranged') {
        f.hitDone=true;
        if(this.projectiles.length<2) this.projectiles.push({owner:i,x:f.x+f.dir*34,y:f.y+(f.crouching?48:f.airAttack?48:100),dir:f.dir,air:f.airAttack,life:150});
      } else {
        const d=this.fighters[1-i],part=contact(attackShapes(f),hurtShapes(d));
        if(part) {
          f.hitDone=true;hits.push({owner:i,air:f.airAttack,x:(part.ax+part.bx)/2,y:(part.ay+part.by)/2});
        }
      }
    });
    this.projectiles=this.projectiles.filter(p=>{
      p.x+=p.dir*6;p.life--;
      const d=this.fighters[1-p.owner];
      if(contact([{ax:p.x-p.dir*6,ay:p.y,bx:p.x,by:p.y,r:8,part:'projectile'}],hurtShapes(d))) {
        hits.push({owner:p.owner,air:p.air,x:p.x,y:p.y});return false;
      }
      return p.life>0&&p.x>=this.camera-30&&p.x<=this.camera+W+30;
    });
    const guardable=this.fighters.map((f,i)=>f.y===0&&f.stun===0&&f.attack<0&&inputs[i].axis*f.dir<0 || f.y===0&&f.blocked&&f.stun>0&&inputs[i].axis*f.dir<0);
    for(const hit of hits) {
      const d=this.fighters[1-hit.owner],s=this.fighters[hit.owner],blocked=guardable[1-hit.owner]&&!hit.air;
      d.hp=blocked?Math.max(1,d.hp-RULES.chip):Math.max(0,d.hp-RULES.damage);
      d.stun=blocked?RULES.blockstun:RULES.hitstun;d.blocked=blocked;d.attack=-1;
      let push=blocked?RULES.guardPush:RULES.knockback;
      if(!blocked&&!hit.air&&s.character.type==='melee'&&s.attackKind==='normal'){
        // Keep the second stationary strike in range, then separate for the third.
        // Voluntary walking/jumping starts a new exchange; automatic recoil does not.
        if(s.stationaryHits===0){
          push=stationaryPush(s,d);
        }
        s.stationaryHits++;
      }
      d.knock=(d.x>=s.x?1:-1)*push;
      this.effects.push({x:hit.x,y:hit.y,blocked,life:14});this.freeze=RULES.hitstop;
    }
    this.camera=clamp((a.x+b.x)/2-W/2,0,W);
    if(this.remaining<=0||a.hp===0||b.hp===0) {
      this.results.push(a.hp===b.hp?null:a.hp>b.hp?0:1);
      this.phase='roundEnd';this.phaseTimer=150;
    }
  }
}
