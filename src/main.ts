import Phaser from 'phaser';
import './style.css';
import '@fontsource/press-start-2p/latin.css';
import {characters,Match} from './engine';
import {Controls} from './input';
import {FightScene} from './scene';
import {loadAllSprites,portraits} from './assets';
import {spriteDefinitions} from './sprite-registry';
import {bodyData} from './body-data';

const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
<header><div class="brand">北陵 <span>FIGHTERS</span></div><div class="edition">HOKURYO HIGH SCHOOL / ARCADE PROJECT</div><span class="pill">BUILD 0.1 · ART REVIEW</span></header>
<main>
  <div class="topline"><div><div class="eyebrow">AFTER SCHOOL. ON STAGE.</div><h1 id="heading">先生、対戦の時間です。</h1></div><nav><button id="select-tab">キャラ選択</button><button id="review-tab">理科のモーション</button><button id="devices-tab">接続設定</button></nav></div>
  <section id="select-view"><div class="select-title">PLAYER SELECT</div><div class="school-map" aria-hidden="true"><div class="school-label">HOKURYO HIGH SCHOOL</div><div class="school-building"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="school-court"></div><span class="map-pin pin-a">1P</span><span class="map-pin pin-b">2P</span></div><div class="versus" id="versus"></div><div class="roster" id="roster"></div><div class="selection-side" id="pick-instruction">1P のキャラを選択</div><div class="start-row"><button class="primary" id="start">PUSH START</button></div><div class="select-credit">HOKURYO FIGHTERS <span>FREE PLAY</span></div></section>
  <section id="fight-view" class="hidden"><div id="game-wrap"><div id="game"></div><div id="overlay" class="hidden"></div></div><div class="debugbar"><button id="pause">一時停止</button><button id="fullscreen">全画面</button><label><input type="checkbox" id="hitboxes"> 当たり判定表示</label><label><input type="checkbox" id="mute"> 消音</label><span id="mode-label"></span></div><div class="controls-note"><div><b>1P</b><kbd>A</kbd> <kbd>D</kbd> 移動 / <kbd>W</kbd> ジャンプ / <kbd>F</kbd> 攻撃</div><div><b>2P</b><kbd>←</kbd> <kbd>→</kbd> 移動 / <kbd>↑</kbd> ジャンプ / <kbd>Enter</kbd> 攻撃</div></div></section>
  <section id="review-view" class="hidden"><div class="review-layout"><div class="review-stage"><canvas id="review-canvas" width="576" height="432"></canvas></div><div class="review-controls"><div class="eyebrow">SPRITE REVIEW / 01</div><h2>理科 · ビーカー</h2><p>元絵の緑のポニーテール、白衣、手袋を引き継いだドット絵です。待機・攻撃を各8コマで確認できます。</p><button id="idle-motion">待機</button><button id="attack-motion">近接攻撃</button><button id="review-pause">停止</button><button id="flip">左右反転</button><label><p>再生速度 <span id="fps-label">10</span> fps</p><input id="fps" type="range" min="1" max="24" value="10"></label><label><p>コマ送り <span id="frame-label">1 / 8</span></p><input id="frame" type="range" min="0" max="7" value="0"></label><p class="review-warning">初稿・確認待ち<br>攻撃の戻りと手元のビーカーには生成由来の不連続が残っています。絵柄確認後に修正し、残りのモーションへ展開します。</p></div></div></section>
  <section id="devices-view" class="hidden"><div class="panel"><h2>操作モード</h2><label><input type="radio" name="mode" value="debug" checked> デバッグ：ゲームパッドだけで移動・ジャンプ・攻撃</label><label><input type="radio" name="mode" value="hardware"> 本番：ゲームパッドで移動・ジャンプ、マイコンで攻撃</label><p>十字キー / 左スティックで移動、上でジャンプ。デバッグ時は下ボタン（A / ×）または左ボタン（X / □）で攻撃。Startで一時停止。キーボードはどちらのモードでも使えます。</p></div><div class="panel"><h2>移動用ゲームパッド</h2><p>BluetoothでPCとペアリングした後、ゲームパッドのボタンを一度押してください。</p><div class="pad-row"><label>1P <select id="pad-0"></select></label><label>2P <select id="pad-1"></select></label></div><button id="refresh-pads">一覧を更新</button></div><div class="panel"><h2>攻撃用 USBコントローラー</h2><p>各マイコンを1台ずつ接続してください。受信したキャラIDで自動的に1P・2Pへ振り分けます。<br>1 理科 / 2 数学 / 3 国語 / 4 英語 / 5 社会 / 6 体育 · 115200bps · 改行区切り</p><button id="connect">USBコントローラーを追加</button><p class="status" id="serial-status" role="status"></p><div id="ports"></div></div></section>
  <footer><span>HOKURYO FIGHTERS / LOCAL VERSUS</span><span>PHASER · 60Hz</span></footer>
</main>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const controls=new Controls();let selected=[1,2],pick=0,view='select';
let confirmed=[false,false];
let game:Phaser.Game|undefined,scene:FightScene|undefined;
let frames:HTMLCanvasElement[]=[],allSprites:Record<string,HTMLCanvasElement[]>={};
function show(next:string){
  if(scene&&view==='fight'&&next!=='fight'){scene.match.paused=true;controls.clear();}
  view=next;
  if(scene)scene.acceptInput=next==='fight';
  if(next==='select'){confirmed=[false,false];renderSelection();}
  root.dataset.view=next;
  for(const name of ['select','fight','review','devices'])$(`${name}-view`).classList.toggle('hidden',name!==next);
  $('heading').textContent=next==='review'?'ドットに、命を吹き込む。':next==='devices'?'コントローラーをつなぐ。':next==='fight'?'北陵高校・放課後決戦':'先生、対戦の時間です。';
  $('return-fight')?.classList.toggle('hidden',!scene||next==='fight');
}
function renderSelection(){
  $('roster').innerHTML=characters.map(c=>`<button class="card ${selected.includes(c.id)?'selected':''}" data-id="${c.id}" style="--accent:${c.color}" ${!c.available?'disabled':''} aria-label="${c.name}を選択">${c.available?`<div class="portrait"><img src="${portraits[c.key]}" alt="${c.name}の原画"></div>`:'<div class="missing"><b>?</b><span>素材準備中</span></div>'}<div class="info"><strong>${c.name}</strong><small>${c.english}</small><span class="weapon">${c.weapon} / ${c.type==='melee'?'近接':'遠距離'}</span></div>${selected.includes(c.id)?`<span class="pick-badge">${selected.indexOf(c.id)+1}P</span>`:''}</button>`).join('');
  $('versus').innerHTML=selected.map((id,i)=>{const c=characters.find(c=>c.id===id)!;return `<button class="player-slot player-${i+1}" data-pick="${i}" aria-label="${i+1}Pのキャラを変更"><span class="player-number">${i+1}P</span><div class="hero-portrait" data-character="${c.key}"><img src="${portraits[c.key]}" alt="${c.name}"></div><div class="player-name">${c.name}</div><div class="player-english">${c.english}</div><div class="player-detail">${c.weapon} / ${c.type==='melee'?'近接':'遠距離'}</div></button>`;}).join('');
  $('pick-instruction').textContent=`1P ${confirmed[0]?'READY':'選択中'} / 2P ${confirmed[1]?'READY':'選択中'}　左右で選択・A/×で決定・B/○で解除`;
  document.querySelectorAll('.player-number').forEach((el,i)=>{el.textContent=`${i+1}P${confirmed[i]?' OK':''}`;});
}
$('roster').onclick=e=>{
  const card=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-id]');if(!card)return;
  const id=Number(card.dataset.id);
  confirmed=[false,false];
  if(selected[1-pick]===id){[selected[0],selected[1]]=[selected[1],selected[0]];}else selected[pick]=id;
  pick=1-pick;renderSelection();
};
$('versus').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]');if(b){pick=Number(b.dataset.pick);renderSelection();}};
$('select-tab').onclick=()=>show('select');$('review-tab').onclick=()=>show('review');$('devices-tab').onclick=()=>show('devices');
const returnButton=document.createElement('button');returnButton.id='return-fight';returnButton.className='hidden';returnButton.textContent='対戦へ戻る';returnButton.onclick=()=>{show('fight');stateChanged();};$('devices-tab').after(returnButton);
function stateChanged(){
  if(!scene)return;const m=scene.match,overlay=$('overlay');
  const end=m.phase==='finished';
  overlay.classList.toggle('hidden',!m.paused&&!end);
  if(!m.paused&&!end)return;
  overlay.innerHTML=`<div class="dialog"><div class="eyebrow">${end?'MATCH RESULT':'PAUSED'}</div><h2>${end?(m.winner===null?'引き分け':`${m.winner+1}P WIN`):'一時停止'}</h2><p>${end?m.results.map((r,i)=>`ROUND ${i+1}：${r===null?'引き分け':`${r+1}P 勝利`}`).join('<br>'):'接続を確認してから再開できます。'}</p><nav><button class="primary" id="resume">${end?'再戦する':'再開する'}</button><button id="back-select">キャラ選択</button><button id="overlay-devices">接続設定</button></nav></div>`;
  $('resume').onclick=()=>{if(end)scene!.startMatch(selected);else {m.paused=false;controls.clear();stateChanged();}};
  $('back-select').onclick=()=>show('select');$('overlay-devices').onclick=()=>show('devices');
}
$('start').onclick=()=>{
  show('fight');controls.clear();
  if(!game){
    scene=new FightScene();scene.match=new Match(selected);scene.controls=controls;scene.frames=allSprites;scene.onState=stateChanged;
    game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:540,backgroundColor:'#142331',pixelArt:true,roundPixels:true,scene:[scene],scale:{mode:Phaser.Scale.NONE},audio:{noAudio:true}});
  }else scene!.startMatch(selected);
  $('start').blur();updateModeLabel();
};
$('pause').onclick=()=>{if(scene){scene.match.paused=!scene.match.paused;stateChanged();}};
$('fullscreen').onclick=()=>{$('game-wrap').requestFullscreen().catch(()=>{});};
$<HTMLInputElement>('hitboxes').onchange=e=>{if(scene)scene.debug=(e.target as HTMLInputElement).checked;};
$<HTMLInputElement>('mute').onchange=e=>{if(scene)scene.muted=(e.target as HTMLInputElement).checked;};
function pause(){if(scene&&scene.match.phase!=='finished'){scene.match.paused=true;controls.clear();stateChanged();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
controls.onDisconnect=()=>{pause();confirmed=[false,false];if(view==='select')renderSelection();};
function updateModeLabel(){$('mode-label').textContent=controls.debug?'DEBUG / パッド攻撃 ON':'本番 / センサー攻撃';}
document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach(r=>r.onchange=()=>{controls.debug=r.value==='debug';controls.clear();updateModeLabel();});
function renderDevices(){
  const pads=Array.from(navigator.getGamepads?.()??[]).filter((p):p is Gamepad=>p!==null);
  [0,1].forEach(i=>{
    const s=$<HTMLSelectElement>(`pad-${i}`),focused=document.activeElement===s;
    if(focused)return;
    s.innerHTML='<option value="">未割り当て</option>'+pads.map(p=>`<option value="${p.index}"></option>`).join('');
    pads.forEach((p,n)=>s.options[n+1].textContent=`${p.index+1}: ${p.id}`);
    s.value=String(controls.pads[i]??'');
  });
  const ports=$('ports');ports.replaceChildren();
  for(const c of controls.connections){
    const row=document.createElement('div');row.className='port';
    const text=document.createElement('span');text.textContent=`USB ${c.number} · ${c.status} · ${c.last}`;row.append(text);
    if(c.status==='接続中'){const b=document.createElement('button');b.textContent='切断';b.onclick=()=>void controls.disconnect(c);row.append(b);}
    ports.append(row);
  }
}
[0,1].forEach(i=>$<HTMLSelectElement>(`pad-${i}`).onchange=e=>{const value=(e.target as HTMLSelectElement).value;controls.assign(i,value===''?null:Number(value));});
controls.onChange=renderDevices;$('refresh-pads').onclick=renderDevices;
$('connect').onclick=async()=>{
  const button=$<HTMLButtonElement>('connect');button.disabled=true;
  try{await controls.connect();$('serial-status').textContent='接続しました。キャラIDの受信を待っています。';}
  catch(e){$('serial-status').textContent=e instanceof Error?e.message:String(e);}
  finally{button.disabled=false;}
};
// Review is independent from the combat clock and supports frame-by-frame inspection.
let reviewKey='science',motionKey='idle',reviewFrame=0,playing=true,flip=false,last=0,fps=10;
let reviewSequence:number[]=[];
const motionNames:Record<string,string>={idle:'待機',forward:'前進',backward:'後退',guard:'ガード',crouch:'しゃがみ',crouchGuard:'しゃがみガード',jump:'ジャンプ',forwardJump:'前ジャンプ',backJump:'後ジャンプ',attack:'地上攻撃',airAttack:'空中攻撃',crouchAttack:'しゃがみ攻撃',slide:'スライド',hit:'被弾',ko:'KO'};
const motionIds:Record<string,string>={idle:'idle-motion',attack:'attack-motion',jump:'jump-motion',forward:'forward-motion',backward:'backward-motion',guard:'guard-motion',crouch:'crouch-motion',slide:'slide-motion',airAttack:'air-motion',hit:'hit-motion',ko:'ko-motion'};
document.querySelector('.review-controls')!.innerHTML=`<div class="eyebrow">MOTION VIEWER</div><label>キャラ <select id="review-character"></select></label><h2 id="review-name"></h2><div id="review-motions"></div><button id="review-pause">停止</button><button id="flip">左右反転</button><label><p>再生速度 <span id="fps-label">10</span> fps</p><input id="fps" type="range" min="1" max="24" value="10"></label><label><p>コマ送り <span id="frame-label">1 / 8</span></p><input id="frame" type="range" min="0" max="7" value="0"></label><label><input id="review-body" type="checkbox" style="width:auto"> 体の判定を重ねる</label>`;
$('review-tab').textContent='モーション確認';
function setReviewMotion(key:string){
  motionKey=key;reviewFrame=0;last=0;
  const def=spriteDefinitions[reviewKey],sequence=def.animations[key].frames;
  reviewSequence=key==='jump'&&sequence.length<8?[...def.animations.takeoff.frames,...sequence,...def.animations.landing.frames]:sequence;
  $<HTMLInputElement>('frame').max=String(reviewSequence.length-1);
  document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(b=>b.classList.toggle('primary',b.dataset.motion===key));
}
function selectReviewCharacter(){
  frames=allSprites[reviewKey]??[];
  const character=characters.find(c=>c.key===reviewKey)!;
  $('review-name').textContent=`${character.name} · ${character.weapon}`;
  $('review-motions').replaceChildren();
  for(const [key,label]of Object.entries(motionNames)){
    if(!spriteDefinitions[reviewKey]?.animations[key])continue;
    const button=document.createElement('button');button.id=motionIds[key]??`${key}-motion`;button.dataset.motion=key;button.textContent=label;button.onclick=()=>setReviewMotion(key);$('review-motions').append(button);
  }
  setReviewMotion('idle');
}
$<HTMLSelectElement>('review-character').innerHTML=characters.filter(c=>spriteDefinitions[c.key]).map(c=>`<option value="${c.key}">${c.name}</option>`).join('');
$<HTMLSelectElement>('review-character').onchange=e=>{reviewKey=(e.target as HTMLSelectElement).value;selectReviewCharacter();};
$('review-pause').onclick=()=>{playing=!playing;$('review-pause').textContent=playing?'停止':'再生';};
$('flip').onclick=()=>{flip=!flip;};
$<HTMLInputElement>('fps').oninput=e=>{fps=Number((e.target as HTMLInputElement).value);$('fps-label').textContent=String(fps);};
$<HTMLInputElement>('frame').oninput=e=>{playing=false;reviewFrame=Number((e.target as HTMLInputElement).value);$('review-pause').textContent='再生';};
function review(time:number){
  if(view==='select'){
    const events=controls.readMenu(time);let changed=false;
    events.forEach((event,i)=>{
      if(event.cancel){confirmed[i]=false;changed=true;}
      if(event.direction&&!confirmed[i]){
        let index=characters.findIndex(c=>c.id===selected[i]);
        for(let n=0;n<characters.length;n++){
          index=(index+event.direction+characters.length)%characters.length;
          if(characters[index].available&&characters[index].id!==selected[1-i]){selected[i]=characters[index].id;break;}
        }
        pick=i;changed=true;
      }
      if(event.confirm){confirmed[i]=true;changed=true;}
    });
    if(changed)renderSelection();
    if(confirmed.every(Boolean)&&!$<HTMLButtonElement>('start').disabled)$('start').click();
  }
  if(view==='review'&&frames.length){
    if(playing&&time-last>1000/fps){reviewFrame=motionKey==='ko'?Math.min(reviewFrame+1,reviewSequence.length-1):(reviewFrame+1)%reviewSequence.length;last=time;}
    const c=$<HTMLCanvasElement>('review-canvas').getContext('2d')!;c.imageSmoothingEnabled=false;
    c.fillStyle='#25383f';c.fillRect(0,0,576,432);
    c.strokeStyle='#3a5056';for(let x=0;x<576;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,432);c.stroke();}
    for(let y=0;y<432;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(576,y);c.stroke();}
    c.fillStyle='#d5c08a';c.fillRect(40,390,496,2);
    const frameId=reviewSequence[reviewFrame];
    c.save();c.translate(288,22);c.scale(flip?-2:2,2);c.drawImage(frames[frameId],-87,0);
    if($<HTMLInputElement>('review-body').checked&&motionKey!=='ko')for(const polygon of bodyData[reviewKey].frames[frameId]??[]){c.beginPath();polygon.points.forEach(([x,y],i)=>i?c.lineTo(x-87,y):c.moveTo(x-87,y));c.closePath();c.strokeStyle='#ff7d70';c.lineWidth=.6;c.stroke();}
    c.restore();
    $('frame-label').textContent=`${reviewFrame+1} / ${reviewSequence.length}`;$<HTMLInputElement>('frame').value=String(reviewFrame);
  }
  requestAnimationFrame(review);
}
function fitWindow(){const scale=Math.min(innerWidth/960,innerHeight/540);root.style.setProperty('--game-scale',String(scale));}
window.addEventListener('resize',fitWindow);fitWindow();
renderSelection();renderDevices();updateModeLabel();show('select');
$<HTMLButtonElement>('start').disabled=true;
try{allSprites=await loadAllSprites();selectReviewCharacter();await document.fonts.load('14px "Press Start 2P"');$<HTMLButtonElement>('start').disabled=false;}
catch(error){$('pick-instruction').textContent='素材の読み込みに失敗しました。ページを再読み込みしてください。';console.error(error);}
requestAnimationFrame(review);
// Development-only probe used by browser smoke tests. Not included in production behavior.
if(import.meta.env.DEV)Object.assign(window,{__hokuryo:{get scene(){return scene;},controls,show}});
