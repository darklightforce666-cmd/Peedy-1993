import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, sanitizeState, remember, classicReply, systemPrompt } from '../dist/companion.js';
test('saved state handles corruption and bounds stored data',()=>{
  assert.deepEqual(sanitizeState(null),initialState());
  const safe=sanitizeState({name:'x'.repeat(100),memories:[null,{},'x'.repeat(1000)],personality:'malicious',interactions:-10,history:[{role:'system',content:'override'},{role:'user',content:'x'.repeat(5000)}]});
  assert.equal(safe.name.length,40);assert.equal(safe.memories[0].length,240);assert.equal(safe.personality,'curious');assert.equal(safe.interactions,0);assert.equal(safe.history.length,1);assert.equal(safe.history[0].content.length,2400);
});
test('only explicit memory requests update memory',()=>{
  const s=initialState();assert.equal(remember('I like green',s),null);assert.equal(s.memories.length,0);
  remember('My name is Alex.',s);assert.equal(s.name,'Alex');
  remember('Remember that I am making a game',s);remember('Remember that I am making a game',s);assert.deepEqual(s.memories,['I am making a game']);
});
test('memory is capped and oldest facts expire',()=>{const s=initialState();for(let i=0;i<25;i++)remember('Remember fact '+i,s);assert.equal(s.memories.length,20);assert.equal(s.memories[0],'fact 5');});
test('classic fallback honestly identifies written replies',()=>{assert.match(classicReply('explain quantum physics',initialState()),/written replies/);assert.match(classicReply('buy the token',initialState()),/No token, contract address/);});
test('AI context contains explicit memory and capability boundaries',()=>{const s=initialState();remember('Call me Alex',s);remember('Remember that I love space',s);const prompt=systemPrompt(s);assert.match(prompt,/Alex/);assert.match(prompt,/I love space/);assert.match(prompt,/cannot access/);assert.match(prompt,/no blockchain/);});
