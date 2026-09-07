import manifest from './sprites.json';
import {RULES,type Fighter} from './engine';
type Definition={animations:Record<string,{frames:number[];ticksPerFrame:number}>};
const definitions:Record<string,Definition>=manifest;
export function poseState(f:Fighter):string{
 return f.hp===0?'ko':f.stun?(f.blocked?(f.crouching?'crouchGuard':'guard'):'hit'):f.takeoff>0?'takeoff':f.landing>0?'landing':f.attack>=0?(f.attackKind==='slide'?'slide':f.airAttack?'airAttack':f.crouching?'crouchAttack':'attack'):f.y>0?f.jumpKind:f.crouching?'crouch':f.walking?(f.backing?'backward':'forward'):'idle';
}
export function syncPose(f:Fighter){const state=poseState(f);if(f.poseState!==state){f.poseState=state;f.poseStarted=f.age;}}
export function animationFrame(f:Fighter):number{
 const def=definitions[f.character.key];if(!def)return 0;
 const state=poseState(f),animation=def.animations[state]??(f.attack>=0?def.animations.attack:def.animations.idle);
 const elapsed=f.hp===0?f.koAge:f.takeoff>0?RULES.takeoff-f.takeoff:f.attack>=0?f.attack:f.poseState===state?f.age-f.poseStarted:0;
 const index=Math.floor(elapsed/animation.ticksPerFrame);
 const airborne=f.y>0&&f.attack<0&&f.stun===0&&f.hp>0;
 const jumpIndex=f.vy>4?0:f.vy< -4?2:1;
 return animation.frames[airborne?Math.min(animation.frames.length-1,jumpIndex):f.hp===0||f.attack>=0||f.takeoff>0||f.stun>0?Math.min(animation.frames.length-1,index):index%animation.frames.length];
}
