import {spriteDefinitions,type SpriteDefinition} from './sprite-registry';
export {spriteDefinitions,type SpriteDefinition} from './sprite-registry';
export async function loadSpriteFrames(def:SpriteDefinition):Promise<HTMLCanvasElement[]> {
  const image=new Image();image.src=def.source;await image.decode();
  return def.frames.map(([x,y,w,h,bodyAnchor])=>{
    const source=document.createElement('canvas');source.width=w;source.height=h;
    const ctx=source.getContext('2d',{willReadFrequently:true})!;
    ctx.drawImage(image,x,y,w,h,0,0,w,h);
    const pixels=ctx.getImageData(0,0,w,h);
    let bottom=0;
    for(let i=0;i<pixels.data.length;i+=4) {
      const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      if(def.chromaKey&&r>160&&b>140&&g<110&&r-g>90&&b-g>70) pixels.data[i+3]=0;
      else if(pixels.data[i+3]) bottom=Math.max(bottom,Math.floor(i/4/w));
    }
    ctx.putImageData(pixels,0,0);
    const cell=document.createElement('canvas');cell.width=192;cell.height=192;
    const out=cell.getContext('2d')!;out.imageSmoothingEnabled=false;
    // Idle body centered; attacks extend forward while the planted rear foot stays registered.
    const scale=def.scale;
    out.drawImage(source,Math.round(87-bodyAnchor*scale),Math.round(184-bottom*scale),w*scale,h*scale);
    return cell;
  });
}
export async function loadAllSprites():Promise<Record<string,HTMLCanvasElement[]>> {
  return Object.fromEntries(await Promise.all(Object.entries(spriteDefinitions).map(async([key,def])=>{
    const frames=await loadSpriteFrames(def);
    for(const sheet of def.extraSheets??[])frames.push(...await loadSpriteFrames({...def,...sheet}));
    return [key,frames];
  })));
}
export const portraits:Record<string,string>={
  science:new URL('../characters/science.png',import.meta.url).href,
  math:new URL('../characters/math.png',import.meta.url).href,
  english:new URL('../characters/english.jpg',import.meta.url).href,
  social:new URL('../characters/social.png',import.meta.url).href,
  pe:new URL('../characters/pe.jpg',import.meta.url).href
};
