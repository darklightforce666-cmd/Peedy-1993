export const STARTER_TRACKS = [
  { id:'moonlight',title:'Moonlight Sonata — I. Adagio sostenuto',artist:'Ludwig van Beethoven',performer:'Juan Felipe Arjona',genre:'Classical',moods:['calm','reflective','focus','night'],tags:['piano','moonlight sonata'],url:'https://upload.wikimedia.org/wikipedia/commons/f/f0/Moonlight.ogg',sourcePage:'https://commons.wikimedia.org/wiki/File:Moonlight.ogg',license:'CC BY 2.5',licenseUrl:'https://creativecommons.org/licenses/by/2.5/',duration:473 },
  { id:'air',title:'Air on the G String',artist:'Johann Sebastian Bach',performer:'United States Air Force Strings, conducted by Keith H. Bland',genre:'Classical',moods:['calm','peaceful','focus'],tags:['strings','orchestra'],url:'https://upload.wikimedia.org/wikipedia/commons/5/55/Air.ogg',sourcePage:'https://commons.wikimedia.org/wiki/File:Air.ogg',license:'Public domain (US)',licenseUrl:'https://commons.wikimedia.org/wiki/File:Air.ogg#Licensing',duration:183 },
  { id:'maple-leaf',title:'Maple Leaf Rag',artist:'Scott Joplin',performer:'United States Marine Band (1906)',genre:'Ragtime',moods:['upbeat','playful','energetic','vintage'],tags:['rag','band'],url:'https://upload.wikimedia.org/wikipedia/commons/3/3a/1906_-_Scott_Joplin%27s_Maple_Leaf_Rag_%281899%29_played_by_the_United_States_Marine_Band.ogg',sourcePage:'https://commons.wikimedia.org/wiki/File:1906_-_Scott_Joplin%27s_Maple_Leaf_Rag_(1899)_played_by_the_United_States_Marine_Band.ogg',license:'Public domain',licenseUrl:'https://creativecommons.org/publicdomain/mark/1.0/',duration:115 },
  { id:'canon',title:'Canon in D Major',artist:'Johann Pachelbel',performer:'Kevin MacLeod',genre:'Classical',moods:['calm','warm','reflective'],tags:['strings','canon'],url:'https://upload.wikimedia.org/wikipedia/commons/5/59/Kevin_MacLeod_-_Canon_in_D_Major.ogg',sourcePage:'https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_-_Canon_in_D_Major.ogg',license:'CC BY 3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',duration:356 },
].map(track=>({...track,source:'starter'}));

export function filenameTags(filename) {
  const name=filename.replace(/\.[^.]+$/,'').replace(/_/g,' ');
  const parts=name.split(/\s+-\s+/);
  return {title:(parts.length>1?parts.slice(1).join(' - '):name).slice(0,120),artist:(parts.length>1?parts[0]:'Unknown artist').slice(0,100),genre:'Your music'};
}
// Read common ID3 text tags locally. No files or tags are uploaded.
export async function readTags(file) {
  const tags=filenameTags(file.name);
  try {
    const b=new Uint8Array(await file.slice(0,256*1024).arrayBuffer());
    if(String.fromCharCode(...b.slice(0,3))!=='ID3'||![3,4].includes(b[3]))return tags;
    const sync=o=>(b[o]<<21)|(b[o+1]<<14)|(b[o+2]<<7)|b[o+3];
    const size=o=>b[3]===4?sync(o):((b[o]*0x1000000)+(b[o+1]<<16)+(b[o+2]<<8)+b[o+3]);
    const end=Math.min(b.length,10+sync(6));
    if(b[5]&0xC0)return tags; // Unsynchronization/extended headers: retain safe filename fallback.
    for(let p=10;p+10<end;){
      const key=String.fromCharCode(...b.slice(p,p+4)),length=size(p+4);if(!length||length<0||p+10+length>end)break;
      if(['TIT2','TPE1','TCON'].includes(key)&&length>1){const enc=b[p+10],raw=b.slice(p+11,p+10+length);const label={0:'iso-8859-1',1:'utf-16',2:'utf-16be',3:'utf-8'}[enc];if(label){const value=new TextDecoder(label).decode(raw).replace(/\0/g,'').trim();if(value)tags[{TIT2:'title',TPE1:'artist',TCON:'genre'}[key]]=value.slice(0,120);}}
      p+=10+length;
    }
  }catch{}
  return tags;
}
let dbPromise;
export function openLibraryDB() {
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('Browser storage is unavailable.'));return;}
    const request=indexedDB.open('peedy-music-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'id'});
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Close other Peedy tabs and try again.'));
    request.onsuccess=()=>resolve(request.result);
  });
  return dbPromise;
}
export async function libraryRecords() { const db=await openLibraryDB();return new Promise((resolve,reject)=>{const r=db.transaction('tracks').objectStore('tracks').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
export async function saveTrack(record) {const db=await openLibraryDB();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(record);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Could not save this song.'));});}
export async function removeTrack(id) {const db=await openLibraryDB();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').delete(id);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);});}
