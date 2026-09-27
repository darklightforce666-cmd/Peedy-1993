// Music requests are resolved against real library entries before any action is executed.
export const normalize = value => String(value || '').normalize('NFD').replace(/([a-zA-Z])[\u0300-\u036f]+/g, '$1').normalize('NFC').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const aliases = [
  [/\b(classic|classical)\b|классик\p{L}*|класич\p{L}*/gu, 'classical'],
  [/\b(jazzy|jazz)\b|джаз\p{L}*/gu, 'jazz'],
  [/\b(relaxing|relax|calming|calm|peaceful|chill)\b|спокойн\p{L}*|спокійн\p{L}*/gu, 'calm'],
  [/\b(happy|cheerful|upbeat|energizing|energetic)\b|весел\p{L}*/gu, 'upbeat'],
  [/\b(focus|studying|study|working)\b/gu, 'focus'],
  [/бетховен\p{L}*/gu, 'beethoven'], [/моцарт\p{L}*/gu, 'mozart'], [/шопен\p{L}*/gu, 'chopin'], [/бах\p{L}*/gu, 'bach'], [/регтайм/gu, 'ragtime'],
];
export function queryWords(value) {
  let text = normalize(value);
  for (const [pattern, replacement] of aliases) text = text.replace(pattern, replacement);
  return text.split(' ').filter(w => w && !['a','an','the','some','something','please','me','music','songs','song','tracks','track','tunes','tune','by','from','of','with','and','to','for','можно','мне','музыку','что','нибудь','пожалуйста','щось','будь','ласка'].includes(w));
}
export function searchTracks(tracks, query) {
  const words = queryWords(query);
  if (!words.length) return [...tracks];
  return tracks.map(track => {
    const title = normalize(track.title), artist = normalize(track.artist);
    const haystack = normalize([track.title, track.artist, track.performer, track.genre, ...(track.moods || []), ...(track.tags || [])].join(' '));
    return {track, score:words.every(word=>haystack.includes(word)) ? words.reduce((n,w)=>n+(title.includes(w)?4:artist.includes(w)?3:1),0):0};
  }).filter(x=>x.score).sort((a,b)=>b.score-a.score).map(x=>x.track);
}
const named = track => `“${track.title}” by ${track.artist}`;
export class MusicDialogue {
  constructor() { this.pending = null; this.results = []; }
  cancel() { this.pending = null; }
  request(input, library, playback = {}) {
    const text = normalize(input).replace(/^(?:(?:hey )?peedy |please |can you |could you |would you )+/,'').replace(/ please$/,'');
    if (!text) return null;
    // Never turn a negated music instruction into playback.
    if (/\b(dont|do not|never)\s+(play|start|put on)|не\s+(включай|играй|ставь|грай)/u.test(text)) { this.cancel(); return {type:'reply', text:'Okay, I won’t start that music.'}; }
    if (/^(cancel|never mind|nevermind|forget it|отмена|не надо|скасувати)$/.test(text)) { this.cancel(); return {type:'reply',text:'Okay. What would you like to hear instead?'}; }
    const controls = [
      [/^(?:(?:can you|could you|please) )?(?:pause(?: (?:it|music|the music|playback))?|пауза|приостанови(?: музыку)?)(?: please)?$/, 'pause'],
      [/^(?:stop(?: (?:it|music|the music|playback))?|останови(?: музыку)?|стоп)(?: please)?$/, 'stop'],
      [/^(?:resume(?: (?:it|music|playback))?|continue(?: playing)?|продолжи(?: музыку)?|продовжуй)(?: please)?$/, 'resume'],
      [/^(?:next(?: (?:one|song|track))?|skip(?: (?:this|it|song|track))?|следующ\p{L}*(?: (?:песн\p{L}*|трек))?|далі|наступн\p{L}*(?: трек)?)(?: please)?$/u, 'next'],
      [/^(?:previous(?: (?:one|song|track))?|go back|предыдущ\p{L}*(?: (?:песн\p{L}*|трек))?|попередн\p{L}*(?: трек)?)(?: please)?$/u, 'previous'],
      [/^(?:restart(?: (?:it|song|track))?|start over|сначала|спочатку)$/, 'restart'],
      [/^(?:mute|sound off|без звука|выключи звук)$/, 'mute'],
      [/^(?:unmute|sound on|включи звук)$/, 'unmute'],
    ];
    for (const [pattern, type] of controls) if (pattern.test(text)) { this.cancel(); return {type}; }
    if (/^(whats playing|what is playing|what song is this|what is this song|now playing|что играет|що грає)$/.test(text)) return {type:'reply',text:playback.current?`${playback.paused?'Paused on':'Now playing'} ${named(playback.current)}.`:'Nothing is playing yet. Ask me to play something classical.'};
    let volume = text.match(/^(?:(?:set|turn|change) (?:the )?)?(?:volume|громкость|гучність)(?: (?:to|на))? (\d{1,3})(?: percent| процентов| відсотків)?$/);
    if (volume) return {type:'volume',value:Math.max(0,Math.min(100,Number(volume[1])))/100};
    if (/^(louder|turn it up|громче|голосніше)$/.test(text)) return {type:'volume',delta:.1};
    if (/^(quieter|softer|turn it down|тише|тихіше)$/.test(text)) return {type:'volume',delta:-.1};
    if (/^(shuffle|shuffle on|shuffle (?:my |the )?(?:music|library|songs))$/.test(text)) { this.cancel(); this.results=[...library];return {type:'shuffle',tracks:[...library]}; }
    if (/^(repeat|repeat on|repeat (?:this|song|track))$/.test(text)) return {type:'repeat',value:true};
    if (/^(repeat off|stop repeating)$/.test(text)) return {type:'repeat',value:false};
    if (this.pending) {
      const number = text.match(/^(?:play |the |number |option |song |track |номер |включи )?(\d{1,2}|first|second|third|fourth|fifth|перв\p{L}*|втор\p{L}*|трет\p{L}*)(?: one| song| track)?$/u);
      const ordinals={first:1,second:2,third:3,fourth:4,fifth:5};
      if (number) {
        let n=ordinals[number[1]] || Number(number[1]);
        if(/^перв/.test(number[1]))n=1;if(/^втор/.test(number[1]))n=2;if(/^трет/.test(number[1]))n=3;
        const selected=this.pending.tracks[n-1];
        if(selected){const queue=[...this.pending.tracks];this.cancel();return {type:'play',track:selected,queue};}
        return {type:'reply',text:`Choose a number from 1 to ${this.pending.tracks.length}, or tell me an artist or genre.`};
      }
      if (/^(yes|yes please|play it|that one|да|так)$/.test(text) && this.pending.tracks.length===1) {const track=this.pending.tracks[0];this.cancel();return {type:'play',track,queue:[track]};}
    }
    if (/^(?:play|play music|play something|put on some music|включи музыку|поставь музыку|увімкни музику)$/.test(text)) {
      if (playback.current && playback.paused && text==='play')return {type:'resume'};
      this.pending={tracks:library.slice(0,5),query:'',kind:'play'};
      return {type:'choices',tracks:this.pending.tracks,text:'What would you like? Tell me an artist, a title, or a mood — for example, “something classical” or “something upbeat”.'};
    }
    let kind=null,query='';
    const play=text.match(/^(?:(?:can you|could you|would you|please|peedy|hey peedy) )?(?:play|put on|start playing|id like to hear|i want to hear|let me hear|включи|поставь|сыграй|увімкни|зіграй)\s+(.+)$/u);
    const find=text.match(/^(?:what do you have(?: (?:by|from|for))?|what have you got(?: by)?|(?:find|search(?: for)?|show(?: me)?|list)(?: (?:songs|tracks|music))?(?: by)?|что (?:у тебя )?есть(?: (?:от|из))?|найди|знайди)\s+(.+)$/u);
    if (play) {kind='play';query=play[1];}
    else if(find){kind='find';query=find[1];}
    else if(/^(?:show (?:my |the )?library|open (?:my |the )?library|what music do you have|what songs do you have|library|моя музыка|библиотека)$/.test(text))return {type:'library'};
    else if(this.pending){kind='play';query=text;}
    else if(/^(something )?(classical|jazz|ragtime|calm|upbeat|relaxing|классику|джаз|спокойное)$/.test(text)){kind='play';query=text;}
    else return null;
    // A new unrelated question should leave music selection rather than swallowing conversation.
    if(this.pending&&!play&&!find&&/^(who|why|how|tell me|remember|my name|что такое|почему|как)\b/u.test(text)){this.cancel();return null;}
    const results=searchTracks(library,query);this.results=results;
    if(!results.length){this.pending={tracks:library.slice(0,5),query:'',kind:'play'};return {type:'missing',tracks:[],text:`I couldn’t find “${query}” in your library. Add your audio files, or try another artist, title, or genre. I won’t substitute a different artist.`};}
    if(kind==='find'){this.pending={tracks:results.slice(0,5),query,kind};return {type:'choices',tracks:this.pending.tracks,text:`I found ${results.length} ${results.length===1?'track':'tracks'}. ${results.length===1?'Say “play it”':'Which one shall I play? Say its name or number'}, or pick below.`};}
    const exact=results.find(t=>normalize(t.title)===normalize(query));
    const broad=/\b(something|anything|some|random)\b/.test(query)||queryWords(query).every(w=>['classical','jazz','ragtime','calm','upbeat','focus','ambient'].includes(w));
    if(results.length===1||exact||broad){this.cancel();return {type:'play',track:exact||results[0],queue:results};}
    this.pending={tracks:results.slice(0,5),query,kind};return {type:'choices',tracks:this.pending.tracks,text:`I found ${results.length} matches. Which one would you like? Say a title or number, or pick below.`};
  }
}
