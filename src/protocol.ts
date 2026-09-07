export function parseSerialLine(line:string):{id:number;attack:boolean}[] {
  try {
    const data:unknown=JSON.parse(line.trim().replace(/([{,]\s*)(\d+)\s*:/g,'$1"$2":'));
    if(!data||typeof data!=='object'||Array.isArray(data)) return [];
    return Object.entries(data).flatMap(([key,value])=> {
      const id=Number(key);
      return /^[1-6]$/.test(key)&&(value===0||value===1)?[{id,attack:value===1}]:[];
    });
  } catch {return [];}
}
export class SerialLines {
  private buffer=''; private dropping=false;
  push(chunk:string) {
    const events:ReturnType<typeof parseSerialLine>=[];
    for(const char of chunk) {
      if(char==='\n') {
        if(!this.dropping) events.push(...parseSerialLine(this.buffer));
        this.buffer='';this.dropping=false;
      } else if(!this.dropping) {
        this.buffer+=char;
        if(this.buffer.length>1024) {this.buffer='';this.dropping=true;}
      }
    }
    return events;
  }
}
