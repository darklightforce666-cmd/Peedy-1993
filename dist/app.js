import {PeedyCharacter} from './character.js';
import {MusicDialogue} from './music-engine.js';
import {MusicPlayer} from './music-player.js';
import { initialState, sanitizeState, STORAGE_KEY, MODEL_ID, classicReply, remember, systemPrompt } from './companion.js';
const $ = selector => document.querySelector(selector);
let state;
try { state = sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { state = initialState(); }
let worker = null, aiReady = false, aiLoading = false, busy = false, activeRequest = null;
let toastTimer, poseTimer, bubbleTimer, recognition, loadTimer;
let playing = false, nextId = 1, storageAvailable = true;
const requests = new Map();
const log = $('#chat-messages');
const character = new PeedyCharacter($('#pet-character'),$('#peedy-image'),$('#peedy-canvas'),$('#character-version'));
let speaking=false, speechRevision=0;
const musicDialogue = new MusicDialogue();
const music = new MusicPlayer({
  onChange: snapshot => {playing=!snapshot.paused;$('#music-button').setAttribute('aria-pressed',String(playing));$('#music-label').textContent=playing?'Pause music':'Play music';if(!speaking)pose(playing?'dance':'');updateStats();},
  onFeedback: message => {if(message)musicReply(message);},
  onSelect: () => musicDialogue.cancel(),
});
function musicReply(text) {if(!text)return;addMessage('assistant',text,'music');persistTurn('assistant',text);bubble(text.length>100?text.slice(0,97)+'…':text);speak(text);}
async function handleMusic(action) {
  const reply=await music.execute(action);if(!reply)return;
  const message=addMessage('assistant',reply,'music');persistTurn('assistant',reply);
  if(action.type==='choices'&&action.tracks.length){const choices=document.createElement('div');choices.className='music-choices';action.tracks.forEach((track,index)=>{const button=document.createElement('button');button.textContent=`${index+1}. ${track.title} — ${track.artist}`;button.onclick=()=>{musicDialogue.cancel();void music.playTrack(track,action.tracks).then(musicReply);};choices.append(button);});message.entry.append(choices);log.scrollTop=log.scrollHeight;}
  bubble(reply.length>100?reply.slice(0,97)+'…':reply);speak(reply);return reply;
}
function notify(message) { $('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4300); }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { if(storageAvailable) notify('Browser storage is unavailable. Memories last until this page closes.');storageAvailable=false; }
  updateStats();
}
function updateStats() {
  $('#memory-count').textContent=state.memories.length+(state.name?1:0);
  $('#interaction-count').textContent=state.interactions ? `${state.interactions} little moment${state.interactions===1?'':'s'} together · ${state.snacks} snack${state.snacks===1?'':'s'}` : 'Your friendship starts here.';
  $('#personality').value=state.personality;
  $('#pet-mood').textContent=playing?'FEELING GROOVY':busy?'A LITTLE THOUGHTFUL':`FEELING ${state.personality.toUpperCase()}`;
  $('#voice-button').setAttribute('aria-pressed',String(state.voice));
  $('#voice-button').setAttribute('aria-label',state.voice?'Turn off spoken replies':'Turn on spoken replies');
}
function bubble(message) { $('#pet-bubble').textContent=message;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>$('#pet-bubble').textContent=state.name?`A good day to be your bird, ${state.name}.`:'A good day to meet a new friend.',7000); }
function pose(kind) {clearTimeout(poseTimer);character.setState(kind||'idle');$('#pet-character').classList.remove('boop','snack','talking','thinking','listening','dance');if(kind)$('#pet-character').classList.add(kind);if(kind==='boop'||kind==='snack')poseTimer=setTimeout(()=>pose(playing?'dance':''),3200);}
function interact(action) {
  state.interactions++;
  if(action==='snack') {
    state.snacks++;pose('snack');
    bubble(['For me? This is the best timeline.','A seed round I can get behind.','Certified snack enthusiast.','You had me at sunflower.'][state.snacks%4]);
    const particle=document.createElement('span');particle.className='snack-particle';particle.textContent='✦';$('#pet-stage').append(particle);setTimeout(()=>particle.remove(),900);
  } else {pose('boop');bubble(['Boop received. Friendship upgraded.','Hey! That’s my thinking beak.','I used to need 16 MB of RAM for that.','Oh, we’re booping now? Excellent.'][state.interactions%4]);}
  save();return { interactions:state.interactions,snacks:state.snacks };
}
function addMessage(role, content, mode='classic') {
  const entry=document.createElement('div');entry.className=`message ${role}`;entry.dataset.mode=mode;
  const label=document.createElement('span');label.className='message-label';label.textContent=role==='assistant'?`PEEDY / ${mode==='ai'?'LOCAL AI':mode==='saved'?'SAVED CHAT':mode==='memory'?'MEMORY':mode==='music'?'MUSIC':'CLASSIC'}`:'YOU';
  const p=document.createElement('p');p.className='message-content';p.textContent=content;
  entry.append(label,p);log.append(entry);log.scrollTop=log.scrollHeight;
  return {entry,text:p};
}
function greeting() { addMessage('assistant',`Oh! A human. Hi${state.name?', '+state.name:', new friend'}!\n\nI’m Peedy, your music assistant. Try “play something classical”, “what do you have by Bach?”, or “play something upbeat”.\n\nYou can pause, skip, change volume, and add your own songs in Music library. No AI download needed for music.\n\n${state.name?'Good to see you again. What’s on your mind?':'What should I call you?'}`); }
function speak(text) {
  if(!state.voice || !('speechSynthesis' in window))return;
  const revision=++speechRevision;
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.rate=1.03;utterance.pitch=1.2;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('en')&&/Samantha|Google US|Daniel/.test(v.name));if(voice)utterance.voice=voice;
  utterance.onstart=()=>{if(revision!==speechRevision)return;speaking=true;music.duck(true);pose('talking');};utterance.onboundary=()=>{if(revision===speechRevision)pose('talking');};utterance.onend=utterance.onerror=()=>{if(revision!==speechRevision)return;speaking=false;music.duck(Boolean(recognition));pose(recognition?'listening':playing?'dance':'');};speechSynthesis.speak(utterance);
}
function persistTurn(role, content) {state.history.push({role,content:content.slice(0,2400)});state.history=state.history.slice(-30);save();}
function setBusy(value) {
  busy=value;$('#send-button').textContent=value?'■':'↑';$('#send-button').setAttribute('aria-label',value?'Stop response':'Send message');
  $('#message-input').disabled=value;document.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=value);$('#clear-chat').disabled=value;updateStats();
}
function setMode() {
  $('#mode-label').textContent=aiReady?'Music + local AI · on your device':'Music assistant · ready';
  $('#ai-banner-label').textContent=aiReady?'Music actions and private, local conversation.':'Music works now. Add AI for open-ended chat.';
  $('#enable-ai').textContent=aiReady?'AI settings ↗':aiLoading?'Loading AI…':'Enable local AI ↗';
}
async function submitMessage(value) {
  const text=value.trim().slice(0,1200);if(!text||busy)return;
  addMessage('user',text);state.interactions++;persistTurn('user',text);
  const memoryReply=remember(text,state);
  if(memoryReply){save();addMessage('assistant',memoryReply,'memory');persistTurn('assistant',memoryReply);bubble('Filed under: things that matter.');speak(memoryReply);return memoryReply;}
  const musicAction=musicDialogue.request(text,music.tracks,music.snapshot());
  if(musicAction)return handleMusic(musicAction);
  if(!aiReady){const reply=classicReply(text,state);addMessage('assistant',reply);persistTurn('assistant',reply);speak(reply);return reply;}
  setBusy(true);const message=addMessage('assistant','Peedy is thinking…','ai');message.entry.classList.add('pending');pose('thinking');
  const id=nextId++;activeRequest=id;let combined='';
  try {
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{worker?.postMessage({type:'stop',id});reject(new Error('This device took too long to answer. Try a shorter message.'));},120000);
      requests.set(id,{resolve:()=>{clearTimeout(timeout);resolve();},reject:error=>{clearTimeout(timeout);reject(error);},onChunk:chunk=>{combined+=chunk;message.text.textContent=combined;message.entry.classList.remove('pending');log.scrollTop=log.scrollHeight;}});
      let history=state.history.slice(-10);while(history[0]?.role!=='user')history.shift();
      worker.postMessage({type:'chat',id,messages:[{role:'system',content:systemPrompt(state)},...history]});
    });
    if(!combined)combined='I lost my train of thought. Could you ask that a different way?';
    message.text.textContent=combined;persistTurn('assistant',combined);speak(combined);return combined;
  } catch(error) {
    const reply=combined ? combined+'\n\n[Response interrupted.]' : error.message || 'The local model stopped. Please try again.';
    message.text.textContent=reply;persistTurn('assistant',reply);notify('Local AI could not finish that reply. Your chat is still saved.');return reply;
  } finally {requests.delete(id);activeRequest=null;message.entry.classList.remove('pending');setBusy(false);pose(playing?'dance':'');$('#message-input').focus();}
}
function showAIError(message) {$('#ai-error').textContent=message;$('#ai-error').hidden=false;}
function resetWorker(reason) {
  worker?.terminate();worker=null;aiReady=false;aiLoading=false;clearTimeout(loadTimer);
  for(const request of requests.values())request.reject(new Error(reason||'The local AI was stopped.'));requests.clear();
  $('#download-ai').disabled=false;$('#download-ai').textContent='Download & enable AI ↗';$('#cancel-ai').hidden=true;$('#ai-progress-wrap').hidden=true;setMode();
}
async function enableAI() {
  if(aiReady){resetWorker('Switched to Classic mode.');notify('Classic mode enabled. Your downloaded model remains cached.');return;}
  if(aiLoading)return;
  $('#ai-error').hidden=true;
  if(!navigator.gpu){showAIError('This browser does not support WebGPU. Open this page in a current desktop Chrome or Edge browser. Classic mode is still available.');return;}
  try {
    const adapter=await navigator.gpu.requestAdapter();if(!adapter){showAIError('No compatible graphics adapter is available. Check hardware acceleration in your browser, or use Classic mode.');return;}
    aiLoading=true;setMode();$('#download-ai').disabled=true;$('#cancel-ai').hidden=false;$('#ai-progress-wrap').hidden=false;$('#ai-progress').value=0;$('#ai-progress-text').textContent='Connecting to the model library…';
    worker=new Worker(new URL('./ai-worker.js',import.meta.url),{type:'module'});
    loadTimer=setTimeout(()=>{resetWorker();showAIError('The download timed out. Check your connection and try again. Downloaded parts may be cached.');},600000);
    worker.onerror=()=>{resetWorker('The AI worker stopped unexpectedly.');showAIError('The AI engine could not start. Your browser may have blocked the model download or run out of graphics memory. Try Chrome or Edge and close other graphics-heavy tabs.');};
    worker.onmessage=({data})=>{
      if(data.type==='progress'){$('#ai-progress').value=Math.round(Math.max(0,Math.min(1,data.progress))*100);$('#ai-progress-text').textContent=data.text;}
      if(data.type==='ready'){
        clearTimeout(loadTimer);aiReady=true;aiLoading=false;$('#ai-progress').value=100;$('#ai-progress-text').textContent='Peedy’s local AI is ready.';$('#download-ai').disabled=false;$('#download-ai').textContent='Switch to Classic mode';$('#cancel-ai').hidden=true;setMode();$('#ai-dialog').close();bubble('A few more brain cells. Same little bird.');notify('Local AI is ready. Say something to Peedy!');
      }
      if(data.type==='error'){
        if(aiLoading){resetWorker();showAIError('Could not load the model. '+String(data.message).slice(0,240));}
        else requests.get(data.id)?.reject(new Error(String(data.message).slice(0,240)));
      }
      if(data.type==='chunk')requests.get(data.id)?.onChunk(data.text);
      if(data.type==='done')requests.get(data.id)?.resolve();
    };
    worker.postMessage({type:'init',model:MODEL_ID});
  } catch(error){resetWorker();showAIError('Unable to initialize local AI. '+error.message);}
}
function renderMemories() {
  const list=$('#memory-list');list.replaceChildren();
  const entries=[...(state.name?[{label:'Your name: '+state.name,index:-1}]:[]),...state.memories.map((label,index)=>({label,index}))];
  if(!entries.length){const empty=document.createElement('p');empty.className='empty-memory';empty.textContent='A fresh floppy disk. Tell me something worth remembering.';list.append(empty);}
  for(const item of entries){const row=document.createElement('div');row.className='memory-item';const text=document.createElement('span');text.textContent=item.label;const button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','Forget '+item.label);button.onclick=()=>{confirmAction('Forget this memory?','This saved fact will be removed. Existing conversation messages stay until you clear the chat.','Forget memory',()=>{if(item.index===-1)state.name='';else state.memories.splice(item.index,1);save();renderMemories();});};row.append(text,button);list.append(row);}
  $('#forget-all').disabled=!entries.length;
}
function confirmAction(title, description, label, action) {$('#confirm-title').textContent=title;$('#confirm-description').textContent=description;$('#confirm-action').textContent=label;$('#confirm-action').onclick=()=>{$('#confirm-dialog').close();action();};$('#confirm-dialog').showModal();}
function switchView(view) {
  if(!['companion','revival','community'].includes(view))view='companion';
  document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!==view+'-view');
  document.querySelectorAll('.nav-link').forEach(n=>{n.classList.toggle('active',n.dataset.view===view);if(n.dataset.view===view)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
  history.replaceState(null,'','#'+view);window.scrollTo({top:0,behavior:'instant'});return{view};
}
function stopMusic() {music.stop();}
async function toggleMusic() {if(playing){music.pause();return;}if(music.current){musicReply(await music.resume());return;}void submitMessage('Play something classical');}
function dictate() {
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){notify('Voice input is unavailable in this browser. You can still type to Peedy.');return;}
  if(recognition){recognition.stop();return;}
  recognition=new Speech();recognition.lang=navigator.language||'en-US';recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{speechRevision++;speaking=false;if('speechSynthesis' in window)speechSynthesis.cancel();music.duck(true);pose('listening');$('#mic-button').classList.add('listening');$('#mic-button').setAttribute('aria-label','Stop dictation');notify('Listening. Your voice request will be sent to Peedy when you finish.');};
  recognition.onresult=event=>{const text=event.results[0][0].transcript;state.voice=true;save();if(busy){$('#message-input').value=text;notify('Your request is ready to send when Peedy finishes.');}else void submitMessage(text);};
  recognition.onerror=event=>notify(event.error==='not-allowed'?'Microphone access was not granted. You can type instead.':'Could not hear that. Try again or type your message.');
  recognition.onend=()=>{$('#mic-button').classList.remove('listening');$('#mic-button').setAttribute('aria-label','Talk to Peedy');recognition=null;music.duck(speaking);if(!speaking)pose(playing?'dance':'');};
  try{recognition.start();}catch{recognition=null;notify('Voice input could not start.');}
}

greeting();for(const message of state.history)addMessage(message.role,message.content,'saved');updateStats();
$('#chat-form').addEventListener('submit',event=>{event.preventDefault();if(busy){worker?.postMessage({type:'stop',id:activeRequest});return;}const input=$('#message-input');const value=input.value;input.value='';input.style.height='';void submitMessage(value);});
$('#message-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#chat-form').requestSubmit();}});
$('#message-input').addEventListener('input',()=>{$('#message-input').style.height='auto';$('#message-input').style.height=Math.min(120,$('#message-input').scrollHeight)+'px';});
document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>void submitMessage(b.dataset.prompt));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('.wordmark').onclick=event=>{event.preventDefault();switchView('companion');};
$('#feed-button').onclick=()=>interact('snack');$('#boop-button').onclick=$('#pet-character').onclick=()=>interact('boop');
$('#music-button').onclick=()=>void toggleMusic();
$('#personality').onchange=event=>{state.personality=event.target.value;save();bubble({curious:'What should we discover today?',chaotic:'My last brain cell has left the group chat.',cozy:'We can just hang out. No rush.'}[state.personality]);};
$('#voice-button').onclick=()=>{if(!('speechSynthesis' in window)){notify('Spoken replies are unavailable in this browser.');return;}state.voice=!state.voice;save();if(state.voice)speak('Voice on. Good to hear from you!');else{speechRevision++;speechSynthesis.cancel();speaking=false;music.duck(Boolean(recognition));pose(recognition?'listening':playing?'dance':'');}};
$('#mic-button').onclick=dictate;
$('#enable-ai').onclick=$('#about-ai').onclick=()=>$('#ai-dialog').showModal();
$('#download-ai').onclick=()=>void enableAI();$('#cancel-ai').onclick=()=>{resetWorker();notify('Download stopped. Classic mode is ready.');};
$('#memory-button').onclick=()=>{renderMemories();$('#memory-dialog').showModal();};
$('#forget-all').onclick=()=>confirmAction('Forget saved memories?','Your saved name and facts will be deleted. Clear chat separately to remove the conversation.','Forget memories',()=>{state.name='';state.memories=[];save();renderMemories();bubble('A fresh page. Still your bird.');});
$('#clear-chat').onclick=()=>confirmAction('Clear this conversation?','Messages will be removed from this browser. Your saved memories will stay.','Clear chat',()=>{state.history=[];save();log.replaceChildren();greeting();});
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{if(event.target===d){const rect=d.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)d.close();}}));
// Music intentionally continues while the user switches tabs.
window.addEventListener('pagehide',()=>{music.dispose();character.dispose();worker?.terminate();recognition?.stop();if('speechSynthesis' in window)speechSynthesis.cancel();});
switchView(location.hash.slice(1)||'companion');
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tools=[
    {name:'peedy_music_status',title:'Read music playback',description:'Read current track, playback position, queue and library titles. Does not expose audio files or chat.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(!input||Object.keys(input).length)throw new Error('Expected an empty object.');const p=music.snapshot();return{current:p.current?{id:p.current.id,title:p.current.title,artist:p.current.artist}:null,paused:p.paused,position:p.position,duration:Number.isFinite(p.duration)?p.duration:null,volume:p.volume,queue:p.queue.map(t=>({id:t.id,title:t.title})),library:music.tracks.map(t=>({id:t.id,title:t.title,artist:t.artist,genre:t.genre}))};}},
    {name:'peedy_music_command',title:'Ask Peedy to control music',description:'Search or control this page’s music library with a natural-language request, such as play something classical, pause, next, or volume 40. May play audio. Does not access files outside songs explicitly added by the user.',inputSchema:{type:'object',properties:{request:{type:'string',maxLength:500}},required:['request'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||typeof input.request!=='string'||!input.request.trim()||input.request.length>500||Object.keys(input).some(k=>k!=='request'))throw new Error('Provide one request string up to 500 characters.');if(busy)throw new Error('Peedy is finishing a response.');await music.ready;const action=musicDialogue.request(input.request,music.tracks,music.snapshot());if(!action)return {handled:false,message:'Try a music request such as play something classical.'};addMessage('user',input.request);persistTurn('user',input.request);const result=await handleMusic(action);return{handled:true,message:result||'Playback changed.'};}},
    {name:'persona_get_status',title:'Read companion status',description:'Read companion mode, personality, and interaction counts. Does not expose chat or memories.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');return{mode:aiReady?'local-ai':aiLoading?'loading':'classic',personality:state.personality,interactions:state.interactions,snacks:state.snacks};}},
    {name:'persona_interact',title:'Play with Peedy',description:'Give Peedy a snack or boop him. Updates the character and this device’s interaction count.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['snack','boop']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||!['snack','boop'].includes(input.action)||Object.keys(input).some(k=>k!=='action'))throw new Error('Use action snack or boop.');return interact(input.action);}},
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
