import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const server=spawn('python',['-m','http.server','4179','--bind','127.0.0.1','--directory','dist'],{windowsHide:true,stdio:'ignore'});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9239',`--user-data-dir=${process.cwd()}/.browser-responsive`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
const timeout=setTimeout(()=>{ws?.close();server.kill();browser.kill();console.error('Browser verification timed out');process.exit(1);},45000);
try{
let tabs;
for(let i=0;i<12;i++){try{tabs=await(await fetch('http://127.0.0.1:9239/json',{signal:AbortSignal.timeout(1000)})).json();break;}catch{await delay(250);}}
if(!tabs)throw Error('Browser unavailable');
ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const results=[];
await call('Network.enable');
await call('Network.setBlockedURLs',{urls:['https://*']});
for(const width of [320,375,480,768,960,1024,1440]){
await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
await call('Page.navigate',{url:'http://127.0.0.1:4179'});
for(let i=0;i<40;i++){if(await evaluate("document.readyState==='complete' && !!document.querySelector('#search')"))break;await delay(150);}
await delay(200);
const checks=await evaluate(`(()=>{
const checks=[];const check=(name,pass)=>checks.push({name,pass:!!pass});
check('no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
check('12 topic cards',document.querySelectorAll('.topic-card').length===12);
const search=document.querySelector('#search');search.value='ENGINE';search.dispatchEvent(new Event('input'));
check('case insensitive search',document.querySelectorAll('.topic-card:not([hidden])').length>0&&document.querySelectorAll('.topic-card:not([hidden])').length<12);
document.querySelector('[data-filter="Locations & Services"]').click();check('combined filters and empty state',!document.querySelector('#empty').hidden);
document.querySelector('#clear-all').click();check('clear filters',document.querySelectorAll('.topic-card:not([hidden])').length===12);
const box=document.querySelector('[data-step]');box.checked=true;box.dispatchEvent(new Event('change'));
check('checklist saves progress',document.querySelector('progress').value===1&&JSON.parse(localStorage.getItem('msc-checklist'))[0]);
document.querySelector('#reset').click();check('checklist reset',document.querySelector('progress').value===0);
if(innerWidth<=960){const menu=document.querySelector('#menu');menu.click();check('mobile menu opens',menu.getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('nav')).display==='flex');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));check('escape closes menu and restores focus',menu.getAttribute('aria-expanded')==='false'&&document.activeElement===menu);menu.click();document.querySelector('nav a').click();check('navigation closes menu',menu.getAttribute('aria-expanded')==='false');}
else check('desktop navigation visible',getComputedStyle(document.querySelector('nav')).display==='flex');
check('five text build stages',document.querySelectorAll('.build-grid article').length===5&&!document.querySelector('.build-grid img'));
const faq=document.querySelector('.faq-list details');faq.querySelector('summary').click();check('FAQ expands',faq.open);
return checks;})()`);
results.push({width,checks});
}
writeFileSync('responsive-validation.json',JSON.stringify({testedAt:new Date().toISOString(),results},null,2));
const failed=results.flatMap(r=>r.checks.filter(c=>!c.pass).map(c=>`${r.width}: ${c.name}`));
console.log(JSON.stringify({widths:results.map(r=>r.width),checks:results.reduce((n,r)=>n+r.checks.length,0),failed}));
if(failed.length)process.exitCode=1;
await call('Browser.close');
}finally{clearTimeout(timeout);ws?.close();server.kill();browser.kill();}
