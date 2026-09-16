import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');await page.locator('#start:not([disabled])').waitFor();
  await page.evaluate(()=>{
    window.pads=[0,1].map(index=>({index,id:`Test ${index}`,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
    navigator.getGamepads=()=>window.pads;
    window.pads[0].axes[0]=1;
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-id="4"] .pick-badge').textContent(),'1P');
  assert.equal(await page.evaluate(()=>window.__hokuryo.controls.pads[0]),0);
  await page.evaluate(()=>{window.pads[0].axes[0]=0;window.pads[0].buttons[0].pressed=true;});
  await page.waitForFunction(()=>document.querySelector('.player-1 .player-number').textContent.includes('OK'));
  assert.equal(await page.locator('#select-view').isVisible(),true);
  await page.evaluate(()=>{window.pads[0].buttons[0].pressed=false;window.pads[0].buttons[1].pressed=true;});
  await page.waitForFunction(()=>!document.querySelector('.player-1 .player-number').textContent.includes('OK'));
  await page.evaluate(()=>{window.pads[0].buttons[1].pressed=false;window.pads[1].axes[0]=-1;});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-id="1"] .pick-badge').textContent(),'2P');
  await page.evaluate(()=>{window.pads[1].axes[0]=0;window.pads[0].buttons[0].pressed=true;});
  await page.waitForTimeout(60);
  await page.screenshot({path:'test-results/pad-select.png'});
  await page.evaluate(()=>{window.pads[0].buttons[0].pressed=false;window.pads[1].buttons[0].pressed=true;});
  await page.waitForFunction(()=>window.__hokuryo.scene?.match.phase==='fight');
  assert.deepEqual(await page.evaluate(()=>window.__hokuryo.scene.match.ids),[4,1]);
  await page.evaluate(()=>{
    window.pads[1].buttons[0].pressed=false;
    const s=window.__hokuryo.scene;s.startMatch([1,5]);s.match.phase='fight';
    s.match.fighters[0].x=900;s.match.fighters[1].x=1120;
    window.pads[0].axes[0]=1;
  });
  await page.waitForFunction(()=>Number(window.__hokuryo.scene.sprites[0].texture.key.split('-')[1])>=48);
  await page.waitForTimeout(100);
  let frame=await page.evaluate(()=>Number(window.__hokuryo.scene.sprites[0].texture.key.split('-')[1]));
  assert.ok(frame>=48&&frame<56);await page.screenshot({path:'test-results/forward.png'});
  await page.evaluate(()=>{window.pads[0].axes[0]=-1;});
  await page.waitForTimeout(100);
  frame=await page.evaluate(()=>Number(window.__hokuryo.scene.sprites[0].texture.key.split('-')[1]));
  assert.ok(frame>=56&&frame<64);await page.screenshot({path:'test-results/backward.png'});
  await page.evaluate(()=>{
    const m=window.__hokuryo.scene.match;m.fighters[1].x=m.fighters[0].x+65;
    m.fighters[1].attack=9;m.fighters[1].hitDone=false;
  });
  await page.waitForFunction(()=>window.__hokuryo.scene.match.fighters[0].blocked);
  await page.evaluate(()=>{window.__hokuryo.scene.match.paused=true;});await page.waitForTimeout(30);
  frame=await page.evaluate(()=>Number(window.__hokuryo.scene.sprites[0].texture.key.split('-')[1]));
  assert.ok(frame>=104&&frame<112);await page.screenshot({path:'test-results/guard.png'});
  // A previously created fight scene must not steal input from character selection.
  await page.evaluate(()=>{window.pads[0].axes[0]=0;window.__hokuryo.show('select');});
  await page.waitForTimeout(50);await page.evaluate(()=>{window.pads[0].axes[0]=-1;});await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-id="2"] .pick-badge').textContent(),'1P');
  assert.equal(await page.evaluate(()=>window.__hokuryo.scene.match.paused),true);
  assert.deepEqual(errors,[]);
  console.log('Gamepad menu passed: auto-join, independent cursors, unavailable/mirror skip, confirm/cancel, match start, return selection; forward/backward/guard textures verified.');
} finally {await browser.close();}
