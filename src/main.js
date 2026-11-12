import './style.css';
const search=document.querySelector('#search');
const cards=[...document.querySelectorAll('.topic-card')];
let category='All topics';
function filter(){let count=0;const q=search.value.trim().toLowerCase();cards.forEach(c=>{c.hidden=!((category==='All topics'||c.dataset.category===category)&&c.dataset.search.includes(q));if(!c.hidden)count++;});document.querySelector('#results').textContent=`${count} guides to get you going`;document.querySelector('#empty').hidden=count>0;document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===category;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});}
search.addEventListener('input',filter);
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;filter();}));
document.querySelector('#clear-search').addEventListener('click',()=>{search.value='';filter();search.focus();});
document.querySelector('#clear-all').addEventListener('click',()=>{search.value='';category='All topics';filter();search.focus();});
const checks=[...document.querySelectorAll('[data-step]')];
try{const saved=JSON.parse(localStorage.getItem('msc-checklist')||'[]');if(Array.isArray(saved))checks.forEach((c,i)=>c.checked=saved[i]===true);}catch{}
function progress(save=true){const count=checks.filter(c=>c.checked).length;document.querySelector('#progress-label').textContent=`${count} of 6 complete`;document.querySelector('progress').value=count;if(save)try{localStorage.setItem('msc-checklist',JSON.stringify(checks.map(c=>c.checked)));}catch{}}
checks.forEach(c=>c.addEventListener('change',()=>progress()));document.querySelector('#reset').addEventListener('click',()=>{checks.forEach(c=>c.checked=false);progress();});progress(false);
const menu=document.querySelector('#menu'),nav=document.querySelector('nav');
function closeMenu(){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
const dialog=document.querySelector('dialog');let opener;
document.querySelectorAll('[data-viewer]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();opener=a;const img=dialog.querySelector('img');img.src=a.href;img.alt=a.dataset.caption;dialog.querySelector('p').textContent=a.dataset.caption;dialog.showModal();}));
dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.querySelectorAll('.photo img').forEach(img=>{const fail=()=>img.parentElement.classList.add('failed');img.addEventListener('error',fail);if(img.complete&&!img.naturalWidth)fail();});
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)nav.querySelectorAll('a').forEach(a=>{if(a.hash===`#${e.target.id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('main section[id]').forEach(s=>observer.observe(s));
const heroImage=document.querySelector('.hero-image');
function heroFallback(){heroImage.hidden=true;document.querySelector('.hero-enlarge').hidden=true;}
heroImage.addEventListener('error',heroFallback);if(heroImage.complete&&!heroImage.naturalWidth)heroFallback();

const compactNavigation=window.matchMedia('(max-width: 960px)');
compactNavigation.addEventListener('change',closeMenu);
document.addEventListener('click',event=>{if(!nav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
document.querySelectorAll('.photo img').forEach(img=>{const hideUnavailableViewer=()=>{const link=img.parentElement.querySelector('[data-viewer]');if(link)link.hidden=true;};img.addEventListener('error',hideUnavailableViewer);if(img.complete&&!img.naturalWidth)hideUnavailableViewer();});
