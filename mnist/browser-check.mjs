import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const server=spawn('python',['-m','http.server','4182','--bind','127.0.0.1'],{cwd:process.cwd(),windowsHide:true,stdio:'ignore'});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9242',`--user-data-dir=${process.cwd()}/.browser-mnist`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;
const timer=setTimeout(()=>{ws?.close();server.kill();browser.kill();process.exit(1);},55000);
try{
 let tabs;for(let i=0;i<40;i++){try{tabs=await(await fetch('http://127.0.0.1:9242/json')).json();break;}catch{await delay(250);}}
 if(!tabs)throw Error('Browser unavailable');
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Network.enable');await call('Network.setBlockedURLs',{urls:['https://fonts.*']});
 const results=[];
 for(const width of [320,768,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===320});
  await call('Page.navigate',{url:'http://127.0.0.1:4182/mnist/'});
  for(let i=0;i<100;i++){if(await evaluate("document.querySelector('#status')?.textContent.includes('Model ready')"))break;await delay(100);}
  const check=await evaluate(`(()=>({width:innerWidth,noOverflow:document.documentElement.scrollWidth<=innerWidth,modelReady:document.querySelector('#status').textContent.includes('Model ready'),rows:document.querySelectorAll('.prob-row').length,initialBlank:document.querySelector('#digit').textContent==='—'}))()`);
  await evaluate("document.querySelector('#recognize').click()");
  check.emptyGuard=await evaluate("document.querySelector('#message').textContent.includes('Draw a digit first')");
  // Pointer events exercise the actual drawing handlers and automatic inference.
  await evaluate(`(()=>{const c=document.querySelector('#drawing'),r=c.getBoundingClientRect();const fire=(type,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'mouse',clientX:r.left+r.width*x,clientY:r.top+r.height*y,bubbles:true}));fire('pointerdown',.38,.23);fire('pointermove',.57,.15);fire('pointermove',.57,.83);fire('pointerup',.57,.83);})()`);
  for(let i=0;i<40;i++){if(await evaluate("document.querySelector('#digit').textContent!=='—'"))break;await delay(100);}
  check.drawPredicts=await evaluate("/^[0-9]$/.test(document.querySelector('#digit').textContent)");
  check.predictedDigit=await evaluate("document.querySelector('#digit').textContent");
  check.hasConfidence=await evaluate("document.querySelector('#confidence').textContent.includes('%')");
  check.previewHasInk=await evaluate("document.querySelector('#processed').getContext('2d').getImageData(0,0,28,28).data.some((v,i)=>i%4===0&&v>0)");
  if(width===1440){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync('mnist-preview.png',Buffer.from(shot.data,'base64'));}
  await evaluate("document.querySelector('#clear').click()");
  check.clearResets=await evaluate("document.querySelector('#digit').textContent==='—' && document.querySelector('#confidence').textContent==='—' && [...document.querySelectorAll('.fill')].every(e=>e.style.width==='0%')");results.push(check);
 }
 writeFileSync('mnist/browser-validation.json',JSON.stringify(results,null,2)+'\n');console.log(results);
 if(results.some(r=>['noOverflow','modelReady','initialBlank','emptyGuard','drawPredicts','hasConfidence','previewHasInk','clearResets'].some(k=>!r[k])||r.rows!==10))process.exitCode=1;
}finally{clearTimeout(timer);ws?.close();server.kill();browser.kill();}
