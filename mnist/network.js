// PyTorch-compatible NCHW inference for the uploaded MNISTCNN.
export function predict(input, weights) {
  function conv(x, size, channels, outputs, w, b) {
    const y = new Float32Array(outputs * size * size);
    for (let o=0;o<outputs;o++) for(let r=0;r<size;r++) for(let c=0;c<size;c++) {
      let sum=b[o];
      for(let i=0;i<channels;i++) for(let kr=0;kr<3;kr++) for(let kc=0;kc<3;kc++) {
        const rr=r+kr-1, cc=c+kc-1;
        if(rr>=0 && rr<size && cc>=0 && cc<size) sum+=x[(i*size+rr)*size+cc]*w[((o*channels+i)*3+kr)*3+kc];
      }
      y[(o*size+r)*size+c]=Math.max(0,sum);
    }
    return y;
  }
  function pool(x,size,channels) {
    const n=size/2,y=new Float32Array(channels*n*n);
    for(let i=0;i<channels;i++) for(let r=0;r<n;r++) for(let c=0;c<n;c++) {
      const k=(i*size+r*2)*size+c*2;
      y[(i*n+r)*n+c]=Math.max(x[k],x[k+1],x[k+size],x[k+size+1]);
    }
    return y;
  }
  function linear(x,w,b,relu) {
    const y=new Float32Array(b.length);
    for(let o=0;o<b.length;o++) {let s=b[o];for(let i=0;i<x.length;i++)s+=x[i]*w[o*x.length+i];y[o]=relu?Math.max(0,s):s;}
    return y;
  }
  let x=pool(conv(input,28,1,16,weights['features.0.weight'],weights['features.0.bias']),28,16);
  x=pool(conv(x,14,16,32,weights['features.3.weight'],weights['features.3.bias']),14,32);
  x=linear(x,weights['classifier.1.weight'],weights['classifier.1.bias'],true);
  const logits=linear(x,weights['classifier.3.weight'],weights['classifier.3.bias'],false);
  const max=Math.max(...logits), p=Array.from(logits,v=>Math.exp(v-max)),sum=p.reduce((a,b)=>a+b,0);
  return {logits:Array.from(logits),probabilities:p.map(v=>v/sum)};
}

export async function loadWeights(base='./') {
  const [mr,wr]=await Promise.all([fetch(base+'model.json'),fetch(base+'weights.bin')]);
  if(!mr.ok||!wr.ok)throw Error('Model files could not be loaded. Please reload.');
  const meta=await mr.json(), buffer=await wr.arrayBuffer(), weights={};
  for(const [name,t] of Object.entries(meta.tensors))weights[name]=new Float32Array(buffer,t.offset*4,t.length);
  return {weights,meta};
}
