import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.locator('#start:not([disabled])').waitFor();
 await page.screenshot({path:'test-results/selection.png',fullPage:true});
 assert.equal(await page.locator('.card').count(),6);
 assert.equal(await page.locator('[data-id="3"]').isDisabled(),true);
 await page.click('#review-tab');await page.waitForTimeout(350);
 await page.screenshot({path:'test-results/review.png',fullPage:true});
 await page.click('#attack-motion');await page.click('#review-pause');
 await page.locator('#frame').fill('3');
 await page.screenshot({path:'test-results/attack.png',fullPage:true});
 await page.click('#jump-motion');await page.locator('#frame').fill('4');
 await page.screenshot({path:'test-results/jump-review.png',fullPage:true});
 await page.click('#select-tab');await page.click('#start');
 await page.waitForFunction(()=>window.__hokuryo?.scene?.match.phase==='fight');
 const before=await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].x);
 await page.keyboard.down('KeyD');await page.waitForTimeout(300);await page.keyboard.up('KeyD');
 assert.ok(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].x)>before);
 await page.keyboard.press('KeyF');await page.waitForTimeout(100);
 assert.ok(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].attack)>=0);
 await page.screenshot({path:'test-results/fight.png',fullPage:true});
 await page.keyboard.press('Escape');await page.locator('#overlay').waitFor({state:'visible'});
 await page.click('#resume');assert.equal(await page.locator('#overlay').isVisible(),false);
 const bounds=await page.locator('#game').boundingBox();
 assert.ok(bounds.width>1400,'game fills viewport width');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
 // Deterministic fake Bluetooth gamepad exercises mapping and button-edge detection.
 await page.evaluate(()=>{
  window.fakePad={index:0,id:'Test pad',axes:[1,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
  navigator.getGamepads=()=>[window.fakePad];window.__hokuryo.controls.assign(0,0);
 });
 const padBefore=await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].x);
 await page.waitForTimeout(700);
 assert.ok(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].x)>padBefore);
 await page.evaluate(()=>{window.fakePad.axes[0]=0;window.fakePad.buttons[0].pressed=true;});
 await page.waitForTimeout(70);
 assert.ok(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].attack)>=0);
 await page.evaluate(()=>{window.fakePad.buttons[0].pressed=false;window.__hokuryo.controls.debug=false;});
 await page.waitForTimeout(700);
 await page.evaluate(()=>{window.fakePad.buttons[0].pressed=true;});await page.waitForTimeout(70);
 assert.equal(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].attack),-1);
 // Selected serial ID attacks; unselected ID does not.
 await page.evaluate(()=>window.__hokuryo.controls.attacks.add(6));await page.waitForTimeout(70);
 assert.equal(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].attack),-1);
 await page.evaluate(()=>window.__hokuryo.controls.attacks.add(1));await page.waitForTimeout(70);
 assert.ok(await page.evaluate(()=>window.__hokuryo.scene.match.fighters[0].attack)>=0);
 assert.deepEqual(errors,[]);
 console.log('Browser smoke passed: selection, sprite preview, Phaser combat, keyboard, pause, gamepad-only mode, serial routing.');
}finally{await browser.close();}
