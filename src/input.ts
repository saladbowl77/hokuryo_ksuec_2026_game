import {neutral, type Input} from './engine';
import {SerialLines} from './protocol';

type Port = {readable:ReadableStream<Uint8Array>|null;open(options:{baudRate:number}):Promise<void>;close():Promise<void>};
type SerialAPI = {requestPort():Promise<Port>};
export type Connection = {number:number;port:Port;status:string;reader?:ReadableStreamDefaultReader<Uint8Array>;last:string;closing:boolean;closed:Promise<void>};
export class Controls {
  keys=new Set<string>(); pressed=new Set<string>(); attacks=new Set<number>();
  pads:(number|null)[]=[null,null]; previous=new Map<number,boolean[]>();
  debug=true; connections:Connection[]=[]; onChange=()=>{}; onDisconnect=()=>{};
  private menuAxis=[0,0]; private menuRepeat=[0,0];
  constructor() {
    window.addEventListener('keydown',e=>{
      if((e.target as HTMLElement)?.matches('input,select,button,textarea')) return;
      if(['KeyA','KeyD','KeyW','KeyS','KeyF','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape'].includes(e.code)) e.preventDefault();
      if(!this.keys.has(e.code)) this.pressed.add(e.code);this.keys.add(e.code);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clear());
    window.addEventListener('gamepadconnected',()=>this.onChange());
    window.addEventListener('gamepaddisconnected',(e:GamepadEvent)=>{
      if(this.pads.includes(e.gamepad.index)) this.onDisconnect();
      this.previous.delete(e.gamepad.index);this.onChange();
    });
  }
  clear(){this.keys.clear();this.pressed.clear();this.attacks.clear();}
  assign(player:number,index:number|null) {
    if(index!==null&&this.pads[1-player]===index) this.pads[1-player]=null;
    this.pads[player]=index;this.onChange();
  }
  read(ids:number[]):{inputs:Input[];pause:boolean} {
    let pause=this.pressed.has('Escape');
    const mapping=[['KeyA','KeyD','KeyW','KeyF'],['ArrowLeft','ArrowRight','ArrowUp','Enter']];
    const inputs=ids.map((id,i)=>{
      const [left,right,up,attack]=mapping[i];
      const input=neutral();
      input.axis=Number(this.keys.has(right))-Number(this.keys.has(left));
      input.jump=this.pressed.has(up);input.attack=this.pressed.has(attack)||this.attacks.has(id);
      input.crouch=this.keys.has(i===0?'KeyS':'ArrowDown');
      const index=this.pads[i],pad=index===null?null:navigator.getGamepads()[index];
      if(pad) {
        const before=this.previous.get(pad.index)??[];
        const down=(n:number)=>!!pad.buttons[n]?.pressed;
        const edge=(n:number)=>down(n)&&!before[n];
        const axis=pad.axes[0]??0;
        const padAxis=down(14)?-1:down(15)?1:Math.abs(axis)>.25?Math.sign(axis):0;
        if(padAxis) input.axis=padAxis;
        const upNow=down(12)||(pad.axes[1]??0)<-.5;
        input.crouch ||=down(13)||(pad.axes[1]??0)>.5;
        input.jump ||=upNow&&!before[20];
        if(this.debug) input.attack ||=edge(0)||edge(2);
        pause ||=edge(9);
        const state=pad.buttons.map(b=>b.pressed);state[20]=upNow;this.previous.set(pad.index,state);
      }
      return input;
    });
    this.pressed.clear();this.attacks.clear();return {inputs,pause};
  }
  readMenu(now:number):{direction:number;confirm:boolean;cancel:boolean}[] {
    const pads=Array.from(navigator.getGamepads?.()??[]);
    for(const pad of pads)if(pad&&!this.pads.includes(pad.index)&&(pad.buttons.some(b=>b.pressed)||pad.axes.some(axis=>Math.abs(axis)>.5))){
      const slot=this.pads.findIndex(index=>index===null||!pads[index]);
      if(slot>=0)this.assign(slot,pad.index);
    }
    const events=this.pads.map((index,i)=>{
      const pad=index===null?null:pads[index];
      if(!pad){this.menuAxis[i]=0;return {direction:0,confirm:false,cancel:false};}
      const before=this.previous.get(pad.index)??[];
      const down=(n:number)=>!!pad.buttons[n]?.pressed,edge=(n:number)=>down(n)&&!before[n];
      const axis=down(14)?-1:down(15)?1:Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0;
      let direction=0;
      if(axis!==this.menuAxis[i]){direction=axis;this.menuRepeat[i]=now+350;}
      else if(axis&&now>=this.menuRepeat[i]){direction=axis;this.menuRepeat[i]=now+120;}
      this.menuAxis[i]=axis;
      const result={direction,confirm:edge(0)||edge(2)||edge(9),cancel:edge(1)};
      this.previous.set(pad.index,pad.buttons.map(b=>b.pressed));return result;
    });
    this.pressed.clear();this.attacks.clear();return events;
  }
  async connect() {
    const serial=(navigator as Navigator&{serial?:SerialAPI}).serial;
    if(!serial) throw new Error('USB接続にはデスクトップChrome / EdgeとlocalhostまたはHTTPSが必要です。');
    if(this.connections.filter(c=>c.status==='接続中').length>=6) throw new Error('6台まで接続できます。');
    const port=await serial.requestPort();
    if(this.connections.some(c=>c.port===port&&c.status==='接続中')) throw new Error('このポートは接続済みです。');
    await port.open({baudRate:115200});
    const connection:Connection={number:this.connections.length+1,port,status:'接続中',last:'受信待ち',closing:false,closed:Promise.resolve()};
    this.connections.push(connection);this.onChange();
    connection.closed=this.readPort(connection);
  }
  async disconnect(c:Connection) {c.closing=true;await c.reader?.cancel();await c.closed;}
  private async readPort(c:Connection) {
    const lines=new SerialLines(),decoder=new TextDecoder();
    try {
      if(!c.port.readable) throw new Error('読み取り可能なポートではありません');
      c.reader=c.port.readable.getReader();
      while(!c.closing) {
        const {value,done}=await c.reader.read();if(done) break;
        for(const event of lines.push(decoder.decode(value,{stream:true}))) {
          c.last=`ID ${event.id} : ${event.attack?1:0}`;
          if(event.attack) this.attacks.add(event.id);
          this.onChange();
        }
      }
    } catch(error) { c.last=String(error); }
    finally {
      c.reader?.releaseLock();c.reader=undefined;
      await c.port.close().catch(()=>{});c.status='切断';this.attacks.clear();this.onChange();this.onDisconnect();
    }
  }
}
