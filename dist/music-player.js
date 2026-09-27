import {STARTER_TRACKS, libraryRecords, saveTrack, removeTrack, readTags} from './music-library.js';
import {searchTracks} from './music-engine.js';
const $=s=>document.querySelector(s);
const formatTime=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
function button(label,action,className=''){const el=document.createElement('button');el.type='button';el.textContent=label;el.className=className;el.onclick=action;return el;}
export class MusicPlayer {
  constructor({onChange,onFeedback,onSelect}) {
    this.audio=$('#music-audio');this.tracks=[...STARTER_TRACKS];this.current=null;this.queue=[];this.revision=0;this.onChange=onChange;this.onFeedback=onFeedback;this.onSelect=onSelect;this.ducked=false;this.volume=.7;this.urls=new Set();this.records=new Map();this.failed=new Set();this.status='Ready to play';this.editing=null;
    this.audio.volume=this.volume;
    $('#play-pause').onclick=()=>this.audio.paused?void this.resume().then(onFeedback):this.pause();
    $('#previous-track').onclick=()=>void this.step(-1).then(onFeedback);$('#next-track').onclick=()=>void this.step(1).then(onFeedback);
    $('#music-volume').oninput=e=>this.setVolume(Number(e.target.value)/100);
    $('#music-seek').oninput=e=>{if(Number.isFinite(this.audio.duration))this.audio.currentTime=Number(e.target.value);};
    $('#open-library').onclick=()=>this.openLibrary();$('#library-search').oninput=()=>this.renderLibrary();
    $('#add-songs').onclick=()=>$('#music-files').click();$('#music-files').onchange=e=>{void this.importFiles([...e.target.files]);e.target.value='';};
    $('#track-form').onsubmit=e=>{e.preventDefault();void this.saveDetails();};
    for(const event of ['loadedmetadata','durationchange','timeupdate','volumechange'])this.audio.addEventListener(event,()=>this.renderPlayer());
    this.audio.addEventListener('playing',()=>{this.status='Playing';this.failed.delete(this.current?.id);this.changed();});
    this.audio.addEventListener('pause',()=>{if(this.status==='Playing'||this.status==='Buffering')this.status='Paused';this.changed();});
    this.audio.addEventListener('waiting',()=>{if(!this.audio.paused){this.status='Buffering';this.renderPlayer();}});
    this.audio.addEventListener('error',()=>{if(!this.current)return;const wasLoading=this.status==='Loading audio…';this.status='Could not load audio';this.failed.add(this.current.id);this.changed();if(!wasLoading)this.onFeedback('That recording could not load. Try another track or add an audio file from your device.');});
    this.audio.addEventListener('ended',()=>{if(this.audio.loop)return;const n=this.queue.findIndex(t=>t.id===this.current?.id);if(n>=0&&n+1<this.queue.length)void this.playTrack(this.queue[n+1],this.queue).then(onFeedback);else{this.status='Queue finished';this.changed();}});
    this.ready=this.restore();this.renderPlayer();this.renderLibrary();
  }
  async restore(){try{for(const record of await libraryRecords()){if(!record?.blob||!record.title)continue;this.records.set(record.id,record);this.tracks.push(this.fromRecord(record));}this.renderLibrary();this.renderPlayer();}catch{$('#library-storage').textContent='Browser storage is unavailable. Added songs will remain for this visit only.';}}
  fromRecord(record){const url=URL.createObjectURL(record.blob);this.urls.add(url);const {blob,...track}=record;return {...track,url,source:'local'};}
  snapshot(){return {current:this.current,paused:this.audio.paused,position:this.audio.currentTime,duration:this.audio.duration,volume:this.volume,queue:this.queue};}
  changed(){this.renderPlayer();this.onChange?.(this.snapshot());}
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.audio.muted=false;this.audio.volume=this.ducked?this.volume*.2:this.volume;$('#music-volume').value=Math.round(this.volume*100);this.renderPlayer();}
  duck(value){this.ducked=value;this.audio.volume=value?this.volume*.2:this.volume;}
  async playTrack(track,queue=[track]){
    if(!track||!this.tracks.some(t=>t.id===track.id))return 'That song is no longer in your library.';
    const revision=++this.revision;this.current=track;this.queue=queue.filter(t=>this.tracks.some(s=>s.id===t.id));if(!this.queue.some(t=>t.id===track.id))this.queue=[track];
    this.status='Loading audio…';this.audio.pause();this.audio.src=track.url;this.audio.load();this.changed();
    let timer;
    try{await Promise.race([this.audio.play(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);})]);if(revision!==this.revision)return null;this.status='Playing';this.changed();return `Playing “${track.title}” by ${track.artist}. ${this.queue.length>1?`${this.queue.length} tracks in the queue.`:''}`.trim();}
    catch(error){if(revision!==this.revision)return null;this.audio.pause();this.status=error.name==='NotAllowedError'?'Tap play to start':'Could not load audio';this.changed();return error.name==='NotAllowedError'?`“${track.title}” is ready. Tap Play in the player to allow audio.`:`I couldn’t play “${track.title}”. The recording may be unavailable. Try another song or add your own audio.`;}
    finally{clearTimeout(timer);}
  }
  pause(){this.revision++;this.audio.pause();this.status=this.current?'Paused':'Ready to play';this.changed();return this.current?'Paused.':'Nothing is playing yet.';}
  stop(){const reply=this.pause();if(this.current)this.audio.currentTime=0;this.status=this.current?'Stopped':'Ready to play';this.changed();return this.current?'Stopped and returned to the beginning.':reply;}
  async resume(){if(!this.current)return 'What would you like to hear? Try “play something classical”.';try{await this.audio.play();this.status='Playing';this.changed();return `Resuming “${this.current.title}”.`;}catch{this.status='Tap play to retry';this.changed();return 'Audio could not start. Try Play again, or choose another recording.';}}
  async step(direction){if(!this.current)return 'Choose a song first.';const index=this.queue.findIndex(t=>t.id===this.current.id);const next=index+direction;if(next<0||next>=this.queue.length)return direction>0?'That is the last track in this queue. Ask for another artist or genre.':'You are at the beginning of this queue.';return this.playTrack(this.queue[next],this.queue);}
  async execute(action){
    switch(action.type){
      case 'play':return this.playTrack(action.track,action.queue);
      case 'pause':return this.pause();case 'stop':return this.stop();case 'resume':return this.resume();case 'next':return this.step(1);case 'previous':return this.step(-1);
      case 'restart':if(!this.current)return 'Choose a song first.';this.audio.currentTime=0;return this.resume();
      case 'mute':this.audio.muted=true;return 'Music muted.';case 'unmute':this.audio.muted=false;return 'Music sound is back on.';
      case 'volume':this.setVolume(action.value??this.volume+action.delta);return `Volume set to ${Math.round(this.volume*100)}%.`;
      case 'repeat':this.audio.loop=action.value;return action.value?'I’ll repeat the current track.':'Track repeat is off.';
      case 'shuffle':{const queue=[...action.tracks];for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}return queue.length?this.playTrack(queue[0],queue):'Add some songs first.';}
      case 'library':this.openLibrary();return `Your library has ${this.tracks.length} tracks. Search by title, artist, genre, or mood.`;
      default:return action.text;
    }
  }
  renderPlayer(){
    $('#now-title').textContent=this.current?.title||'What shall we listen to?';$('#now-artist').textContent=this.current?.artist||`${this.tracks.length} tracks ready · add your own`;
    $('#playback-status').textContent=this.status;$('#play-pause').textContent=this.audio.paused?'▶':'Ⅱ';$('#play-pause').setAttribute('aria-label',this.audio.paused?'Play music':'Pause music');
    const duration=Number.isFinite(this.audio.duration)?this.audio.duration:(this.current?.duration||0);$('#music-seek').max=duration||1;$('#music-seek').value=this.audio.currentTime||0;$('#music-seek').disabled=!this.current||!Number.isFinite(this.audio.duration);$('#elapsed-time').textContent=formatTime(this.audio.currentTime);$('#duration-time').textContent=formatTime(duration);
    $('#queue-count').textContent=this.queue.length?`${Math.max(1,this.queue.findIndex(t=>t.id===this.current?.id)+1)} / ${this.queue.length}`:'No queue';
    const link=$('#now-source');link.hidden=!this.current?.sourcePage;if(this.current?.sourcePage){link.href=this.current.sourcePage;link.textContent='Recording & credits ↗';}
    $('#library-count').textContent=this.tracks.length;$('#music-volume-label').textContent=this.audio.muted?'Muted':`${Math.round(this.volume*100)}%`;
  }
  openLibrary(){this.renderLibrary();if(!$('#library-dialog').open)$('#library-dialog').showModal();}
  renderLibrary(){
    const query=$('#library-search').value;const tracks=searchTracks(this.tracks,query);const list=$('#library-tracks');list.replaceChildren();$('#library-result-count').textContent=`${tracks.length} ${tracks.length===1?'track':'tracks'}`;
    if(!tracks.length){const p=document.createElement('p');p.className='empty-memory';p.textContent='No matches. Try an artist, genre, or add your own songs.';list.append(p);}
    for(const track of tracks){const row=document.createElement('article');row.className='library-track';const info=document.createElement('div');info.className='library-track-info';const title=document.createElement('strong');title.textContent=track.title;const artist=document.createElement('span');artist.textContent=`${track.artist} · ${track.genre}`;const credit=document.createElement('small');credit.textContent=track.source==='local'?'On this device only':`${track.performer} · ${track.license}`;info.append(title,artist,credit);
      if(track.sourcePage){const a=document.createElement('a');a.href=track.sourcePage;a.target='_blank';a.rel='noreferrer';a.textContent='Source & license ↗';info.append(a);}
      const actions=document.createElement('div');actions.className='track-actions';const play=button('▶',()=>{this.onSelect?.(track);$('#library-dialog').close();void this.playTrack(track,tracks).then(this.onFeedback);},'track-play');play.setAttribute('aria-label',`Play ${track.title}`);actions.append(play);
      if(track.source==='local'){actions.append(button('Edit',()=>this.edit(track)),button('Remove',()=>{this.removeCandidate=track;$('#remove-track-name').textContent=track.title;$('#remove-track-dialog').showModal();$('#remove-track-confirm').onclick=()=>{void this.remove(track);$('#remove-track-dialog').close();};}));}
      row.append(info,actions);list.append(row);
    }
  }
  async importFiles(files){
    await this.ready;let added=0,skipped=0,unsaved=0;$('#add-songs').disabled=true;$('#add-songs').textContent='Adding songs…';
    try{for(const file of files.slice(0,100)){if(!/\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(file.name)||file.size>150*1024*1024){skipped++;continue;}const id=`local-${file.name}-${file.size}-${file.lastModified}`;if(this.records.has(id)){skipped++;continue;}const tags=await readTags(file);const record={id,...tags,blob:file,moods:[],source:'local'};this.records.set(id,record);this.tracks.push(this.fromRecord(record));try{await saveTrack(record);}catch{unsaved++;}added++;}this.renderLibrary();this.renderPlayer();this.onFeedback(`Added ${added} ${added===1?'song':'songs'} to your library.${skipped?` Skipped ${skipped} duplicate, unsupported, or over-150 MB files.`:''}${unsaved?' Browser storage is full or unavailable; some songs last for this visit only.':''}`);}
    finally{$('#add-songs').disabled=false;$('#add-songs').textContent='+ Add your songs';}
  }
  edit(track){this.editing=track;$('#track-title').value=track.title;$('#track-artist').value=track.artist;$('#track-genre').value=track.genre;$('#track-moods').value=(track.moods||[]).join(', ');$('#track-dialog').showModal();}
  async saveDetails(){const track=this.editing;if(!track)return;Object.assign(track,{title:$('#track-title').value.trim().slice(0,120)||track.title,artist:$('#track-artist').value.trim().slice(0,100)||'Unknown artist',genre:$('#track-genre').value.trim().slice(0,60)||'Your music',moods:$('#track-moods').value.split(',').map(t=>t.trim().slice(0,30)).filter(Boolean).slice(0,8)});const record={...this.records.get(track.id),title:track.title,artist:track.artist,genre:track.genre,moods:track.moods};this.records.set(track.id,record);try{await saveTrack(record);}catch{this.onFeedback('Updated for this visit. Browser storage could not save the changes.');}this.renderLibrary();this.renderPlayer();$('#track-dialog').close();}
  async remove(track){if(this.current?.id===track.id){this.stop();this.current=null;this.audio.removeAttribute('src');this.audio.load();}this.tracks=this.tracks.filter(t=>t.id!==track.id);this.queue=this.queue.filter(t=>t.id!==track.id);this.records.delete(track.id);URL.revokeObjectURL(track.url);this.urls.delete(track.url);try{await removeTrack(track.id);}catch{this.onFeedback('Removed for this visit, but browser storage could not be updated.');}this.renderLibrary();this.changed();}
  dispose(){this.audio.pause();for(const url of this.urls)URL.revokeObjectURL(url);}
}
