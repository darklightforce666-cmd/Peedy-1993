let engine=null;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const {CreateMLCEngine}=await import('https://esm.run/@mlc-ai/web-llm@0.2.85');
      engine=await CreateMLCEngine(data.model,{initProgressCallback:p=>self.postMessage({type:'progress',progress:p.progress,text:p.text})},{context_window_size:4096});
      self.postMessage({type:'ready'});
    }
    if(data.type==='chat'){
      if(!engine)throw new Error('The local model is not ready.');
      const stream=await engine.chat.completions.create({messages:data.messages,temperature:.8,top_p:.9,max_tokens:300,stream:true});
      for await(const chunk of stream){const text=chunk.choices[0]?.delta?.content;if(text)self.postMessage({type:'chunk',id:data.id,text});}
      self.postMessage({type:'done',id:data.id});
    }
    if(data.type==='stop'&&engine)engine.interruptGenerate();
  }catch(error){self.postMessage({type:'error',id:data.id,message:error.message||String(error)});}
};
