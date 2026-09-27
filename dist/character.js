// Original Microsoft Agent sprite frames, composited with their original transparency.
// Gestures follow speech events. This is not a phoneme/viseme lip-sync renderer.
export class PeedyCharacter {
  constructor(button, portrait, canvas, toggle) {
    this.button=button;this.portrait=portrait;this.canvas=canvas;this.toggle=toggle;this.context=canvas.getContext('2d');this.state='';this.timer=null;this.idleTimer=null;this.sequence=0;this.data=null;this.sheet=null;this.mode='animated';this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    try{this.mode=localStorage.getItem('peedy-visual')||'animated';}catch{}
    toggle.onclick=()=>{this.mode=this.mode==='animated'?'portrait':'animated';try{localStorage.setItem('peedy-visual',this.mode);}catch{}this.refresh();};
    this.load().catch(()=>{this.mode='portrait';this.toggle.textContent='1995 Persona portrait';this.toggle.disabled=true;});
  }
  async load(){const [data,sheet]=await Promise.all([fetch('/assets/peedy-agent/agent.json').then(r=>{if(!r.ok)throw Error('Animation metadata unavailable');return r.json();}),new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='/assets/peedy-agent/map.png';})]);this.data=data;this.sheet=sheet;this.refresh();}
  refresh(){const animated=this.mode==='animated'&&this.data&&this.sheet;this.canvas.hidden=!animated;this.portrait.hidden=Boolean(animated);this.button.classList.toggle('animated-character',Boolean(animated));this.toggle.textContent=animated?'Original Agent animation · switch to 1995 portrait':'1995 Persona portrait · switch to animation';this.toggle.setAttribute('aria-pressed',String(Boolean(animated)));if(animated){this.draw(this.data.animations.RestPose.frames[0]);this.setState(this.state||'idle',true);}else{clearTimeout(this.timer);clearTimeout(this.idleTimer);}}
  draw(frame){if(!frame?.images?.length)return;const [w,h]=this.data.framesize;this.context.clearRect(0,0,w,h);for(const [x,y] of frame.images)this.context.drawImage(this.sheet,x,y,w,h,0,0,w,h);}
  setState(state,force=false){state=state||'idle';if(state===this.state&&!force)return;this.state=state;clearTimeout(this.idleTimer);if(this.mode!=='animated'||!this.data)return;const mapping={idle:'RestPose',boop:'Pleased',snack:'Pleased',talking:'Explain',thinking:'Thinking',listening:'Hearing_1',dance:'Idle3_3'};const name=mapping[state]||'RestPose';if(this.reduced){clearTimeout(this.timer);this.sequence++;this.draw(this.data.animations.RestPose.frames[0]);return;}this.play(name,()=>{if(this.state!==state)return;if(['talking','thinking','listening','dance'].includes(state))this.idleTimer=setTimeout(()=>this.setState(state,true),state==='talking'?500:900);else if(state==='idle')this.scheduleBlink();});}
  scheduleBlink(){this.idleTimer=setTimeout(()=>{if(this.state!=='idle')return;this.play('Blink',()=>this.scheduleBlink());},4000+Math.random()*3000);}
  play(name,onEnd){clearTimeout(this.timer);const token=++this.sequence;const animation=this.data.animations[name]||this.data.animations.RestPose;const frames=animation.frames;let i=0,steps=0,lastDrawable=0,exiting=false;const start=performance.now();
    const finish=()=>{if(token!==this.sequence)return;this.draw(this.data.animations.RestPose.frames[0]);onEnd?.();};
    const tick=()=>{if(token!==this.sequence||this.mode!=='animated')return;if(i>=frames.length||steps++>450){finish();return;}const frame=frames[i];if(!frame.images?.length&&!frame.duration){const held=frames[lastDrawable];if(!exiting&&animation.useExitBranching){exiting=true;if(Number.isInteger(held.exitBranch)){i=held.exitBranch;this.timer=setTimeout(tick,Math.max(180,held.duration||100));return;}}finish();return;}
      if(frame.images?.length){this.draw(frame);lastDrawable=i;}if(performance.now()-start>4200)exiting=true;
      let next=i+1;if(exiting&&Number.isInteger(frame.exitBranch))next=frame.exitBranch;else if(!exiting&&frame.branching?.branches){let roll=Math.random()*100;for(const branch of frame.branching.branches){roll-=branch.weight;if(roll<0){next=branch.frameIndex;break;}}}
      if(performance.now()-start>6500){finish();return;}i=next;this.timer=setTimeout(tick,Math.max(25,frame.duration||100));};tick();
  }
  dispose(){clearTimeout(this.timer);clearTimeout(this.idleTimer);this.sequence++;}
}
