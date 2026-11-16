import {readFileSync,writeFileSync} from 'node:fs';
import {predict} from './network.js';
const meta=JSON.parse(readFileSync(new URL('./model.json',import.meta.url))),bytes=readFileSync(new URL('./weights.bin',import.meta.url)),weights={};
for(const [name,t] of Object.entries(meta.tensors))weights[name]=new Float32Array(bytes.buffer,bytes.byteOffset+t.offset*4,t.length);
const samples=JSON.parse(readFileSync(new URL('./reference.json',import.meta.url)));
let maxError=0,matches=0,correct=0;
for(const s of samples){const {logits}=predict(s.pixels,weights),pick=x=>x.indexOf(Math.max(...x));if(pick(logits)===pick(s.logits))matches++;if(pick(logits)===s.label)correct++;maxError=Math.max(maxError,...logits.map((x,i)=>Math.abs(x-s.logits[i])));}
const result={samples:samples.length,predictionsMatchingPyTorch:matches,maxLogitError:maxError,correct,testAccuracy:meta.test_accuracy};
writeFileSync(new URL('./inference-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(result);
if(matches!==samples.length||maxError>0.001)process.exit(1);
