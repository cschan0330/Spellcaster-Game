import {loadWeights,predict} from './network.js';
const $=id=>document.getElementById(id),canvas=$('drawing'),ctx=canvas.getContext('2d'),preview=$('processed'),pctx=preview.getContext('2d');
let weights,down=false,hasInk=false,busy=false;
const rows=Array.from({length:10},(_,i)=>{const row=document.createElement('div');row.className='prob-row';row.innerHTML=`<span>${i}</span><div class="track"><div class="fill" style="width:0%"></div></div><span>—</span>`;$('probabilities').append(row);return row;});
function point(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*560/r.width,(e.clientY-r.top)*560/r.height];}
canvas.addEventListener('pointerdown',e=>{if(busy)return;e.preventDefault();down=true;canvas.setPointerCapture(e.pointerId);const [x,y]=point(e);ctx.strokeStyle=ctx.fillStyle='#fff';ctx.lineWidth=+$('brush').value*2;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.arc(x,y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x,y);hasInk=true;$('placeholder').style.display='none';});
canvas.addEventListener('pointermove',e=>{if(!down)return;ctx.lineTo(...point(e));ctx.stroke();});
function end(){if(down){down=false;if(weights)recognize();}}
canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
function preprocess(){
  const data=ctx.getImageData(0,0,560,560).data;let x0=560,y0=560,x1=-1,y1=-1;
  for(let y=0;y<560;y++)for(let x=0;x<560;x++)if(data[(y*560+x)*4+3]>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<0)return null;
  const crop=document.createElement('canvas');crop.width=crop.height=28;const c=crop.getContext('2d');c.fillStyle='black';c.fillRect(0,0,28,28);const w=x1-x0+1,h=y1-y0+1,s=20/Math.max(w,h);c.drawImage(canvas,x0,y0,w,h,(28-w*s)/2,(28-h*s)/2,w*s,h*s);
  const pixels=c.getImageData(0,0,28,28).data;let mass=0,mx=0,my=0;for(let i=0;i<784;i++){let v=pixels[i*4];mass+=v;mx+=(i%28)*v;my+=Math.floor(i/28)*v;}
  pctx.fillStyle='black';pctx.fillRect(0,0,28,28);pctx.drawImage(crop,Math.round(13.5-mx/mass),Math.round(13.5-my/mass));
  const final=pctx.getImageData(0,0,28,28).data;return Float32Array.from({length:784},(_,i)=>final[i*4]/255);
}
async function recognize(){
  if(!weights||busy)return;if(!hasInk){$('message').textContent='Draw a digit first, then try again.';return;}
  busy=true;$('recognize').disabled=true;
  await new Promise(r=>requestAnimationFrame(r));
  try{const input=preprocess(),start=performance.now(),{probabilities:p}=predict(input,weights),ms=performance.now()-start,winner=p.indexOf(Math.max(...p));
    $('digit').textContent=winner;$('confidence').textContent=(p[winner]*100).toFixed(1)+'%';$('time').textContent=ms.toFixed(0)+' ms · on your device';
    rows.forEach((row,i)=>{row.classList.toggle('winner',i===winner);row.querySelector('.fill').style.width=p[i]*100+'%';row.lastElementChild.textContent=(p[i]*100).toFixed(1)+'%';});
    $('message').textContent=p[winner]<.7?'This one is a little ambiguous. Try a clearer digit or compare the probabilities.':'Prediction complete. Try another digit, or add a stroke to refine it.';
  }catch(e){$('message').textContent='Prediction failed: '+e.message;}finally{busy=false;$('recognize').disabled=false;}
}
$('recognize').addEventListener('click',recognize);
$('clear').addEventListener('click',()=>{ctx.clearRect(0,0,560,560);pctx.clearRect(0,0,28,28);hasInk=false;down=false;$('placeholder').style.display='flex';$('digit').textContent='—';$('confidence').textContent='—';$('time').textContent='Waiting for your first digit';$('message').textContent='Canvas cleared. Try a new digit.';rows.forEach(r=>{r.classList.remove('winner');r.querySelector('.fill').style.width='0%';r.lastElementChild.textContent='—';});});
loadWeights('/mnist/').then(({weights:w,meta})=>{weights=w;$('status').innerHTML='<i></i> Model ready';$('recognize').disabled=false;$('accuracy').textContent=`CNN · ${meta.test_accuracy.toFixed(2)}% MNIST test accuracy`;if(hasInk)recognize();}).catch(e=>{$('status').textContent='Model unavailable';$('message').textContent=e.message;});
