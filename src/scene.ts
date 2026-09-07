import Phaser from 'phaser';
import {Match,W,H,WORLD,FLOOR,RULES,type Fighter} from './engine';
import type {Controls} from './input';
import {portraits,spriteDefinitions} from './assets';
import {hurtShapes,attackShapes,type Capsule} from './collision';
import {animationFrame} from './animation';
import {imageTransform} from './body-data';

export class FightScene extends Phaser.Scene {
  match!:Match; controls!:Controls; frames:Record<string,HTMLCanvasElement[]>={};
  graphics!:Phaser.GameObjects.Graphics; sprites:Phaser.GameObjects.Image[]=[];
  collisionGraphics!:Phaser.GameObjects.Graphics;
  background!:Phaser.GameObjects.Image;
  hp:Phaser.GameObjects.Text[]=[]; timer!:Phaser.GameObjects.Text; banner!:Phaser.GameObjects.Text;
  labels:Phaser.GameObjects.Text[]=[]; projectileLabels:Phaser.GameObjects.Text[]=[];
  accumulator=0; debug=false; muted=false; onState=()=>{}; audio?:AudioContext;
  acceptInput=true;
  constructor(){super('fight');}
  preload(){for(const [key,url] of Object.entries(portraits))this.load.image(key,url);this.load.image('school-courtyard','/assets/school-courtyard.png');}
  create(){
    this.background=this.add.image(0,0,'school-courtyard').setOrigin(0,0);
    const backdrop=this.background.texture.getSourceImage() as HTMLImageElement;
    this.background.setDisplaySize(backdrop.width*H/backdrop.height,H);
    this.graphics=this.add.graphics();
    for(const [key,frames] of Object.entries(this.frames))frames.forEach((frame,i)=>this.textures.addCanvas(`${key}-${i}`,frame));
    this.sprites=this.match.fighters.map(f=>this.add.image(0,0,this.frames[f.character.key]?`${f.character.key}-0`:f.character.key).setOrigin(.5,1));
    this.collisionGraphics=this.add.graphics().setDepth(5);
    const style={fontFamily:'"Press Start 2P", monospace',fontSize:'14px',color:'#fff4cf',fontStyle:'normal',stroke:'#090e31',strokeThickness:3};
    this.hp=[this.add.text(36,19,'',style),this.add.text(W-36,19,'',style).setOrigin(1,0)];
    this.timer=this.add.text(W/2,43,'60',{...style,fontSize:'29px',color:'#ffe148'}).setOrigin(.5,0);
    this.add.text(W/2,12,'K.O.',{...style,fontSize:'15px',color:'#ff7659'}).setOrigin(.5,0);
    this.banner=this.add.text(W/2,200,'',{...style,fontSize:'52px',stroke:'#101b2b',strokeThickness:8}).setOrigin(.5);
    this.labels=this.match.fighters.map(()=>this.add.text(0,0,'',{...style,fontSize:'11px'}).setOrigin(.5));
    this.projectileLabels=[0,1].map(()=>this.add.text(0,0,'',{...style,fontSize:'23px',color:'#fff2b2',stroke:'#22313c',strokeThickness:4}).setOrigin(.5));
    this.draw();
  }
  startMatch(ids:number[]){this.match=new Match(ids);this.accumulator=0;this.controls.clear();this.onState();}
  soundHit(blocked:boolean){
    if(this.muted)return;
    try {
      this.audio??=new AudioContext();void this.audio.resume();
      const oscillator=this.audio.createOscillator(),gain=this.audio.createGain(),time=this.audio.currentTime;
      oscillator.type='square';oscillator.frequency.setValueAtTime(blocked?540:180,time);oscillator.frequency.exponentialRampToValueAtTime(45,time+.09);
      gain.gain.setValueAtTime(.035,time);gain.gain.exponentialRampToValueAtTime(.001,time+.12);
      oscillator.connect(gain);gain.connect(this.audio.destination);oscillator.start();oscillator.stop(time+.13);
    }catch{/* Sound is optional when the browser has not granted audio playback. */}
  }
  update(_time:number,delta:number){
    if(!this.match||!this.graphics)return;
    if(!this.acceptInput){this.accumulator=0;return;}
    this.accumulator+=Math.min(delta,100);
    while(this.accumulator>=1000/60){
      const {inputs,pause}=this.controls.read(this.match.ids);
      if(pause){this.match.paused=!this.match.paused;this.onState();}
      const oldPhase=this.match.phase,oldFreeze=this.match.freeze;
      this.match.tick(inputs);
      if(this.match.freeze>oldFreeze)this.soundHit(this.match.effects.at(-1)?.blocked??false);
      if(this.match.phase!==oldPhase)this.onState();
      this.accumulator-=1000/60;
    }
    this.draw();
  }
  draw(){
    const g=this.graphics,m=this.match,c=m.camera;g.clear();
    this.collisionGraphics.clear();
    const rect=(x:number,y:number,w:number,h:number,color:number)=>{g.fillStyle(color);g.fillRect(Math.round(x),Math.round(y),w,h);};
    // Preserve image proportions; pan across its excess width without exposing edges.
    const progress=Phaser.Math.Clamp(c/(WORLD-W),0,1);
    this.background.x=-(this.background.displayWidth-W)*progress;
    this.projectileLabels.forEach(t=>t.setVisible(false));
    for(const [i,p] of m.projectiles.entries()){
      const x=p.x-c,y=FLOOR-p.y,key=m.fighters[p.owner].character.key;
      if(key==='math'){g.lineStyle(5,0xaee1f5);g.strokeTriangle(x-18,y+14,x+18,y+14,x+18,y-14);}
      else if(key==='english')this.projectileLabels[i]?.setPosition(x,y).setText('HELLO!').setVisible(true);
      else {g.lineStyle(5,0xffde82);g.strokeEllipse(x,y,30,65);g.lineStyle(2,0xfff4c2);g.strokeEllipse(x-p.dir*10,y,28,50);}
    }
    m.fighters.forEach((f,i)=>{
      const x=f.x-c,y=FLOOR-f.y,s=this.sprites[i];
      g.fillStyle(0x22373b,.28);g.fillEllipse(x,FLOOR+3,65,12);
      const transform=imageTransform(f);
      s.setPosition(x,y+transform.offsetY).setFlipX(f.dir<0).setAngle(transform.angle);
      const def=spriteDefinitions[f.character.key];
      if(def){
        s.setTexture(`${f.character.key}-${animationFrame(f)}`);
      }else {
        // Original concept art is explicit temporary art pending the agreed visual review.
        s.setTexture(f.character.key);
      }
      s.setDisplaySize(transform.width*transform.scaleX,transform.height*transform.scaleY).setOrigin(transform.originX/transform.width,transform.originY/transform.height);
      s.setTint(f.stun&&!f.blocked?0xffa7a7:0xffffff);
      this.labels[i].setPosition(x,FLOOR+24).setText(`${i+1}P  ${f.character.name}${f.blocked?'  GUARD':''}`).setColor(i===0?'#ffe4a0':'#e1f6ff');
      if(f.blocked){g.lineStyle(3,0xb2eaff);g.strokeEllipse(x+f.dir*27,y-62,20,88);}
      if(this.debug){
        const drawShape=(shape:Capsule,color:number)=>{
          const cg=this.collisionGraphics,ax=shape.ax-c,ay=FLOOR-shape.ay,bx=shape.bx-c,by=FLOOR-shape.by;
          cg.lineStyle(shape.r*2,color,.23);cg.lineBetween(ax,ay,bx,by);cg.fillStyle(color,.23);cg.fillCircle(ax,ay,shape.r);cg.fillCircle(bx,by,shape.r);
          cg.lineStyle(1,color,.9);cg.strokeCircle(ax,ay,shape.r);cg.strokeCircle(bx,by,shape.r);
        };
        hurtShapes(f).forEach(shape=>{
          const cg=this.collisionGraphics;
          const points=shape.points.map(p=>({x:p.x-c,y:FLOOR-p.y}));
          cg.fillStyle(0x59ddff,.16);cg.fillPoints(points,true);
          cg.lineStyle(1,0x59ddff,.9);cg.strokePoints(points,true);
          cg.fillStyle(0x59ddff,1);points.forEach(p=>cg.fillRect(p.x-1,p.y-1,2,2));
        });
        if(f.attack>=RULES.startup&&f.attack<RULES.startup+RULES.active&&f.character.type==='melee')attackShapes(f).forEach(shape=>drawShape(shape,0xff655a));
      }
    });
    for(const e of m.effects){
      const x=e.x-c,y=FLOOR-e.y,size=(15-e.life)*2+8;
      g.lineStyle(3,e.blocked?0xa1e3ff:0xfff0a0,e.life/14);
      for(let n=0;n<8;n++){const angle=n*Math.PI/4;g.lineBetween(x+Math.cos(angle)*6,y+Math.sin(angle)*6,x+Math.cos(angle)*size,y+Math.sin(angle)*size);}
    }
    // Arcade HUD floats over the stage, with yellow life and red lost-health segments.
    rect(25,37,397,31,0x160e32);rect(W-422,37,397,31,0x160e32);
    m.fighters.forEach((f,i)=>{
      const x=i?W-416:36;rect(x-3,40,383,25,0xf7e6bc);rect(x,43,377,19,0xc72d36);
      const width=377*f.hp/100;rect(i?x+377-width:x,43,width,19,0xffd83e);rect(i?x+377-width:x,43,width,5,0xffff9b);
      const name=f.character.key==='social'?'SOCIAL':f.character.key==='math'?'MATH':f.character.key==='pe'?'P.E.':f.character.english;
      this.hp[i].setText(`${i+1}P  ${name}`);
      for(let r=0;r<2;r++)rect(i?W-47-r*18:36+r*18,76,10,8,m.results[r]===i?0xf7d47e:0x455664);
    });
    this.timer.setText(String(Math.ceil(m.remaining/60)).padStart(2,'0'));
    let text='';
    if(m.phase==='intro')text=m.phaseTimer>40?`ROUND ${m.round}`:'FIGHT!';
    if(m.phase==='roundEnd')text=m.fighters.some(f=>f.hp===0)?'K.O.':'TIME UP';
    this.banner.setText(text);
  }
}
