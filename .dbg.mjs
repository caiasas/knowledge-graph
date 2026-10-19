
import { spawn } from 'node:child_process';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9430 + Math.floor(Math.random()*20);
const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--no-first-run','--user-data-dir=D:/deepseek_harness/knowledge_graph/.dbg_' + Date.now(),'--remote-debugging-port='+port,'about:blank'], {stdio:'ignore'});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let url;
for (let i=0;i<60;i++){ try{ const r=await fetch('http://127.0.0.1:'+port+'/json/list'); const l=await r.json(); const p=l.find(t=>t.type==='page'); if(p){url=p.webSocketDebuggerUrl;break;} }catch(e){} await sleep(200); }
const ws = new WebSocket(url); await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
let id=0; const pend=new Map(); const errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);} if(m.method==='Runtime.exceptionThrown') errs.push(((m.params.exceptionDetails.exception||{}).description||'').slice(0,300));};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const evalv = async (expr) => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true}); if(r.result&&r.result.exceptionDetails) return 'EXC'; return r.result && r.result.result ? r.result.result.value : null; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:2.5,mobile:true});
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
await send('Page.navigate',{url:'http://127.0.0.1:8777/index.html?debug=1&cb=' + Date.now()});
await sleep(2500);
console.log('title: ' + await evalv('document.title'));
console.log('nodes: ' + await evalv('document.querySelectorAll(".node").length'));
console.log('hover:none: ' + await evalv('matchMedia("(hover: none)").matches'));
console.log('dpr: ' + await evalv('window.devicePixelRatio'));
console.log('cores: ' + await evalv('navigator.hardwareConcurrency'));
console.log('mem: ' + await evalv('navigator.deviceMemory'));
console.log('perf: ' + await evalv('document.documentElement.classList.contains("perf")'));
console.log('fps: ' + await evalv('window.__fps'));
console.log('errors: ' + JSON.stringify(errs));
ws.close(); proc.kill();
