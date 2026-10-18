(function(){
'use strict';
const L=LOGIC;
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>L.ymd(new Date());
const fk=n=>n==null||n===''||isNaN(n)?'':String(Math.round(n*100)/100);
const fdate=s=>{ try{ return L.parseYmd(s).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}); }catch(e){ return s; } };
const clone=o=>JSON.parse(JSON.stringify(o));
const DEF_PROFILE=()=>({v:1,name:'',setup:false,target:4,days:[0,2,4,5],eq:{bb:true,db:true,mach:true,cable:true,kb:true},activePid:null,ptr:{w:6,d:0,done:false},fuel:{sex:'m',age:'',h:'',act:1.55,goal:'recomp',rate:0.5,meals:4,fat:0.8,bf:'',lean:''},weights:[],foodOn:false,food:{},libRead:{},libNotes:{},customLib:[],prog:true,rest:true,rec:{},cardio:[],meas:[],wu:'std',wuOn:true});
const S={tab:'train',profile:DEF_PROFILE(),programs:[],sessions:[],active:null,status:'local',cap:{sample:null,downloads:null,images:false},rest:null,
  ui:{planTab:'program',lib:'all',rz:{goal:'size',focus:'full',time:30,seed:1,plan:null,wake:false},bw:null,bd:0,bpid:null,confirm:null,imp:{text:'',res:null,busy:false,err:'',images:[]},inWorkout:false,summary:null,fuelDay:today(),libAdd:false,progKey:null,msg:'',addEx:'',wuOpen:true,cd:{type:'Walk',effort:'easy',min:'',date:''},ms:{d:'',waist:'',chest:'',arm:'',thigh:''}}};
const LS_KEY='ironlog.v1',LS_ACTIVE='ironlog.active',LS_UI='ironlog.ui',LS_COLL='gainskeeper.collapsed';
function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
/* ---------- storage ---------- */
const Cloud={ref:null,on:false,q:{},pt:null};
function setStatus(s){ S.status=s; const el=$('#sync'); if(el) el.textContent=syncText(); }
function syncText(){ return S.status==='cloud'?'Saved to your account':S.status==='error'?'Cloud save failed. Kept on this device.':S.status==='connecting'?'Connecting...':'This device only'; }
function enqueue(key,fn){ const prev=Cloud.q[key]||Promise.resolve(); const p=prev.then(fn).then(()=>{ if(S.status==='error') setStatus('cloud'); }).catch(e=>{ console.warn('cloud',e); setStatus('error'); }); Cloud.q[key]=p; return p; }
function cloudProfile(){ if(!Cloud.on) return; clearTimeout(Cloud.pt); Cloud.pt=setTimeout(()=>enqueue('profile',()=>Cloud.ref.set({j:JSON.stringify(S.profile),updated:Date.now()})),700); }
function cloudSave(coll,o){ if(!Cloud.on) return; enqueue(coll+'/'+o.id,()=>Cloud.ref.collection(coll).doc(o.id).set({j:JSON.stringify(o),date:o.date||'',updated:Date.now()})); }
function cloudDel(coll,id){ if(!Cloud.on) return; enqueue(coll+'/'+id,()=>Cloud.ref.collection(coll).doc(id).delete()); }
function saveLocal(){ lsSet(LS_KEY,{profile:S.profile,programs:S.programs,sessions:S.sessions}); }
function saveProfile(){ saveLocal(); cloudProfile(); }
function saveSession(s){ const i=S.sessions.findIndex(x=>x.id===s.id); if(i>=0) S.sessions[i]=s; else S.sessions.push(s); saveLocal(); cloudSave('sessions',s); }
function delSession(id){ S.sessions=S.sessions.filter(s=>s.id!==id); saveLocal(); cloudDel('sessions',id); }
function saveProgram(p){ const i=S.programs.findIndex(x=>x.id===p.id); if(i>=0) S.programs[i]=p; else S.programs.push(p); saveLocal(); cloudSave('programs',p); }
function delProgram(id){ S.programs=S.programs.filter(p=>p.id!==id); if(S.profile.activePid===id){ S.profile.activePid=S.programs[0]?S.programs[0].id:null; S.profile.ptr={w:0,d:0,done:false}; } saveLocal(); cloudDel('programs',id); saveProfile(); }
function ensureSeed(){
  if(S.programs.length) { if(!S.profile.activePid) S.profile.activePid=S.programs[0].id; return; }
}
function loadLocal(){
  const d=lsGet(LS_KEY); if(d){ S.profile=Object.assign(DEF_PROFILE(),d.profile||{}); S.profile.fuel=Object.assign(DEF_PROFILE().fuel,(d.profile||{}).fuel||{}); S.programs=d.programs||[]; S.sessions=d.sessions||[]; if((d.profile||{}).setup===undefined&&(S.programs.length||S.sessions.length)) S.profile.setup=true; }
  const a=lsGet(LS_ACTIVE); if(a&&a.ex) S.active=a;
  ensureSeed();
}
async function connect(){
  S.cap.downloads=window.GK_DOWNLOADS||null;
  setStatus('local'); render();
}
/* ---------- ui helpers ---------- */
const ICON={train:'<svg viewBox="0 0 24 24"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>',plan:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',progress:'<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/></svg>',fuel:'<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3 2-4 .5 1.5 1.5 2 2 2 0-3 0-5 2-8z"/></svg>',library:'<svg viewBox="0 0 24 24"><path d="M5 4h5v16H5zM12 4h4v16h-4zM18 6l2 .7-4 13.3-2-.6z"/></svg>'};
const TICK='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function plateLogo(){ return '<svg width="32" height="32" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14" fill="var(--blue)"/><circle cx="15" cy="15" r="11" fill="none" stroke="var(--blue-ink)" stroke-opacity=".4" stroke-width="1.2"/><circle cx="15" cy="12.6" r="2.7" fill="var(--bg)"/><path d="M13.5 14.2h3l1.1 6.3h-5.2z" fill="var(--bg)"/></svg>'; }
const PLATE=['var(--red)','var(--blue)','var(--yellow)','var(--green)','var(--muted)','var(--ink)'];
function barbell(total){
  const n=L.plateCount(total); let g='<rect x="4" y="46" width="312" height="6" rx="3" fill="var(--muted)"/><rect x="20" y="40" width="10" height="18" rx="2" fill="var(--muted)"/><rect x="290" y="40" width="10" height="18" rx="2" fill="var(--muted)"/>';
  for(let i=0;i<n;i++){ const h=64-i*7, w=12-(i>3?3:0); const x1=34+i*13, x2=286-i*13-w; const c=PLATE[i%PLATE.length];
    g+='<rect x="'+x1+'" y="'+(49-h/2)+'" width="'+w+'" height="'+h+'" rx="3" fill="'+c+'"/><rect x="'+x2+'" y="'+(49-h/2)+'" width="'+w+'" height="'+h+'" rx="3" fill="'+c+'"/>'; }
  if(n>=6) g+='<rect x="'+(34+6*13)+'" y="42" width="6" height="14" rx="2" fill="var(--ink)"/><rect x="'+(286-6*13-6)+'" y="42" width="6" height="14" rx="2" fill="var(--ink)"/>';
  return '<svg viewBox="0 0 320 98" class="ch" role="img" aria-label="Barbell with '+(n*2)+' plates">'+g+'</svg>';
}
function chart(pts,o){
  o=o||{}; if(pts.length<2) return '<p class="muted small">A chart shows once there are two or more points.</p>';
  const W=320,H=150,pl=36,pr=10,pt=10,pb=22; const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const x0=Math.min(...xs),x1=Math.max(...xs); let y0=Math.min(...ys),y1=Math.max(...ys); const pd=(y1-y0)*0.15||1; y0-=pd; y1+=pd;
  const X=v=>pl+(x1===x0?0.5:(v-x0)/(x1-x0))*(W-pl-pr), Y=v=>pt+(1-(v-y0)/(y1-y0))*(H-pt-pb);
  let g=''; for(let i=0;i<3;i++){ const v=y0+(y1-y0)*i/2; g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+Math.round(v*10)/10+'</text>'; }
  const d=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ');
  let dots=''; const mx=Math.max(...ys); pts.forEach(p=>{ dots+='<circle cx="'+X(p.x).toFixed(1)+'" cy="'+Y(p.y).toFixed(1)+'" r="'+(p.y===mx&&o.best?5:3)+'" fill="'+(p.y===mx&&o.best?'var(--yellow)':'var(--blue)')+'"/>'; });
  const lab=t=>new Date(t).toLocaleDateString('en-AU',{day:'numeric',month:'short'});
  return '<svg viewBox="0 0 '+W+' '+H+'" class="ch" role="img" aria-label="'+esc(o.label||'Chart')+'">'+g+(o.avg?'':'')+'<path d="'+d+'" fill="none" stroke="var(--blue)" stroke-width="2"/>'+dots+'<text x="'+pl+'" y="'+(H-5)+'">'+lab(x0)+'</text><text x="'+(W-pr)+'" y="'+(H-5)+'" text-anchor="end">'+lab(x1)+'</text></svg>';
}
function bars(vals,target){
  const W=320,H=100,pb=16,m=Math.max(target+1,...vals.map(v=>v.count)); const bw=(W-10)/vals.length;
  let g='<line x1="0" x2="'+W+'" y1="'+(H-pb-(target/m)*(H-pb-6))+'" y2="'+(H-pb-(target/m)*(H-pb-6))+'" stroke="var(--yellow)" stroke-dasharray="4 3"/>';
  vals.forEach((v,i)=>{ const h=(v.count/m)*(H-pb-6); g+='<rect x="'+(5+i*bw+2)+'" y="'+(H-pb-h)+'" width="'+(bw-4)+'" height="'+h+'" rx="3" fill="'+(v.count>=target-1&&v.count>0?'var(--green)':'var(--blue)')+'"/>'; if(v.count) g+='<text x="'+(5+i*bw+bw/2)+'" y="'+(H-pb-h-3)+'" text-anchor="middle">'+v.count+'</text>'; });
  g+='<text x="5" y="'+(H-3)+'">12 weeks ago</text><text x="'+(W-5)+'" y="'+(H-3)+'" text-anchor="end">this week</text>';
  return '<svg viewBox="0 0 '+W+' '+H+'" class="ch" role="img" aria-label="Sessions per week">'+g+'</svg>';
}
function ask(id,label,act,data,cls){ const on=S.ui.confirm===id; return '<button class="btn sm '+(on?'warn':(cls||'ghost'))+'" data-act="ask" data-id="'+esc(id)+'" data-do="'+act+'" data-arg="'+esc(data||'')+'">'+(on?'Tap again to confirm':label)+'</button>'; }
function toast(m){ S.ui.msg=m; const el=$('#toast'); if(el){ el.textContent=m; el.hidden=!m; } clearTimeout(toast.t); toast.t=setTimeout(()=>{ S.ui.msg=''; const e=$('#toast'); if(e) e.hidden=true; },3500); }
function activeProg(){ return S.programs.find(p=>p.id===S.profile.activePid)||S.programs[0]||null; }
