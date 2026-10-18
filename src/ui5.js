/* ---------- render ---------- */
const TABS=[['train','Train'],['plan','Plan'],['progress','Progress'],['fuel','Fuel'],['library','Library']];
function header(){ return '<div class="top"><div class="brand">'+plateLogo()+'<span>Gainskeeper<small>Strength and shape, kept.</small></span></div><div class="sync" id="sync" aria-live="polite">'+esc(syncText())+'</div></div><div class="knurl" aria-hidden="true"></div>'; }
function render(){
  const y=window.scrollY; const app=$('#app'); const tb=$('#tabbar'); let h;
  if(!S.profile.setup){ h=viewSetup(); tb.hidden=true; }
  else if(S.ui.summary){ h=viewSummary(); tb.hidden=true; }
  else if(S.ui.inWorkout&&S.active){ h=viewWorkout(); tb.hidden=true; }
  else {
    S.ui.inWorkout=false; tb.hidden=false;
    const v={train:viewTrain,plan:viewPlan,progress:viewProgress,fuel:viewFuel,library:viewLibrary}[S.tab]; h=header()+'<main>'+v()+'</main>';
    tb.innerHTML='<div class="tabs" role="tablist">'+TABS.map(t=>'<button class="tab" role="tab" data-act="tab" data-v="'+t[0]+'"'+(S.tab===t[0]?' aria-current="page" aria-selected="true"':' aria-selected="false"')+'>'+ICON[t[0]]+t[1]+'</button>').join('')+'</div>';
  }
  app.innerHTML=h; decorateCards(); window.scrollTo(0,y); tickClock();
}
function cardKey(c){ const t=c.querySelector('h2,h3,.lbl'); return t?S.tab+':'+(S.tab==='plan'?S.ui.planTab+':':'')+t.textContent.trim().slice(0,40):null; }
function decorateCards(){
  const m=$('#app main'); if(!m) return; const col=lsGet(LS_COLL)||{};
  m.querySelectorAll('.card').forEach(c=>{
    if(c.parentElement.closest('.card')) return; const t=c.querySelector('h2,h3,.lbl'); const k=cardKey(c); if(!t||!k) return;
    let head=t; while(head.parentElement!==c) head=head.parentElement; if(head.querySelector('input,textarea,select')) return;
    head.classList.add('chead'); c.classList.add('hasx'); c.dataset.ck=k; if(col[k]) c.classList.add('cc');
    const b=document.createElement('button'); b.type='button'; b.className='cxb'; b.dataset.act='cx'; b.setAttribute('aria-expanded',col[k]?'false':'true'); b.setAttribute('aria-label',(col[k]?'Expand ':'Minimise ')+t.textContent.trim());
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'; c.appendChild(b);
  });
  const all=document.createElement('div'); all.className='cxall'; all.innerHTML='<button type="button" class="linkbtn" data-act="cxall"></button>'; m.insertBefore(all,m.firstChild); cxLabel();
}
function cxLabel(){ const b=$('.cxall button'); if(!b) return; const open=document.querySelectorAll('#app main .card.hasx:not(.cc)').length; b.textContent=open?'Collapse all':'Expand all'; }
function cxAll(){ const cards=[...document.querySelectorAll('#app main .card.hasx')]; if(!cards.length) return; const collapse=cards.some(c=>!c.classList.contains('cc')); const col=lsGet(LS_COLL)||{}; cards.forEach(c=>{ c.classList.toggle('cc',collapse); if(collapse) col[c.dataset.ck]=1; else delete col[c.dataset.ck]; const b=c.querySelector('.cxb'); if(b) b.setAttribute('aria-expanded',collapse?'false':'true'); }); lsSet(LS_COLL,col); cxLabel(); }
function pad2(n){ return String(n).padStart(2,'0'); }
function tickClock(){
  const el=$('#elapsed'); if(el&&S.active){ const s=Math.max(0,Math.floor((Date.now()-S.active.start)/1000)); el.textContent=Math.floor(s/3600)?Math.floor(s/3600)+':'+pad2(Math.floor(s%3600/60))+':'+pad2(s%60):pad2(Math.floor(s/60))+':'+pad2(s%60); }
  const rb=$('#restbar'); if(!S.rest||!S.ui.inWorkout){ rb.hidden=true; return; }
  const left=Math.ceil((S.rest.end-Date.now())/1000); const t=$('#rt');
  if(left<=0){ if(!S.rest.fired){ S.rest.fired=true; try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){} if(t) t.textContent='Go'; const l=$('#rl'); if(l) l.textContent='Rest over'; S.rest.doneAt=Date.now(); } if(S.rest.doneAt&&Date.now()-S.rest.doneAt>6000){ S.rest=null; rb.hidden=true; } return; }
  if(t) t.textContent=Math.floor(left/60)+':'+pad2(left%60);
}
function startRest(sec){
  if(!S.profile.rest||(S.active&&S.active.past)) return; S.rest={end:Date.now()+sec*1000,total:sec,fired:false};
  const rb=$('#restbar'); rb.innerHTML='<div class="in"><span id="rl" class="small">Rest</span><span class="t num" id="rt"></span><span class="grow"></span><button class="btn sm" data-act="rest30">+30s</button><button class="btn sm" data-act="restskip">Skip</button></div>'; rb.hidden=false; tickClock();
}
/* ---------- actions ---------- */
function tgtWeek(){ const a=activeProg(); return a; }
const DO={
  delSess:id=>{ delSession(id); render(); },
  discardWork:()=>{ S.active=null; lsDel(LS_ACTIVE); S.ui.inWorkout=false; S.rest=null; render(); },
  rmex:i=>{ S.active.ex.splice(+i,1); saveActive(); render(); },
  delProg:id=>{ delProgram(id); S.ui.bpid=null; S.ui.bw=null; render(); },
  delCardio:id=>{ S.profile.cardio=S.profile.cardio.filter(x=>x.id!==id); saveProfile(); render(); },
  libdel:id=>{ S.profile.customLib=S.profile.customLib.filter(x=>x.id!==id); saveProfile(); render(); }
};
function finishWorkout(){
  const a=S.active; const ex=a.ex.map(e=>({name:e.name,key:e.key,note:e.note||'',sets:e.sets.filter(s=>s.done).map(s=>({kg:+s.kg||0,reps:+s.reps||+s.tr||0,done:true}))})).filter(e=>e.sets.length);
  if(!ex.length){ toast('Tick at least one set before finishing.'); return; }
  const s={id:a.id,date:a.date,start:a.start,dur:a.editing?(a.dur||0):a.past?0:Math.round((Date.now()-a.start)/1000),type:a.type,title:a.title,pid:a.pid||null,w:a.w==null?null:a.w,d:a.d==null?null:a.d,goal:a.goal||null,focus:a.focus||null,notes:a.notes||'',ex};
  saveSession(s);
  if(!a.editing&&a.type==='program'&&a.pid===S.profile.activePid){ const prog=activeProg(); if(prog){ S.profile.ptr=L.advance(prog,{w:a.w,d:a.d}); saveProfile(); } }
  const prs=L.prsFor(s,S.sessions); S.ui.summary={s,prs}; S.active=null; lsDel(LS_ACTIVE); S.ui.inWorkout=false; S.rest=null; window.scrollTo(0,0); render();
}
function addExercise(){
  const nm=(S.ui.addEx||'').trim(); if(!nm){ toast('Type an exercise name first.'); return; }
  const hist=L.buildHist(S.sessions); const pr=L.prettify(nm); const key=L.keyOf(nm); const db=L.DB.find(e=>L.keyOf(e.n)===key); const h=(hist[key]||[])[0];
  const it={name:db?db.n:pr.name,key,tag:db?db.t:'',eq:db?db.q:'bb',timed:db?!!db.timed:false,main:false,sets:3,lo:8,hi:12,rest:90,rpe:8,ss:null};
  const e=fromPlanItem(it,hist); e.target.repsText='8 to 12'; if(!e.sug&&h) e.sets.forEach(s=>{ s.kg=h.topKg; });
  S.active.ex.push(e); S.ui.addEx=''; saveActive(); render();
}
function exCount(r){ return r&&r.prog?r.prog.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+d.ex.length,0),0):0; }
function autoParse(){
  const im=S.ui.imp; im.res=null; if(!im.text||!im.text.trim()) return; let r=null, via='';
  if(im.items&&im.items.length){ const g=L.parseGrid(im.items); if(g.rows>=3){ const rr=L.parseCSV(g.csv); if(exCount(rr)>0){ r=rr; im.text=g.csv; const wn=[...new Set(rr.prog.weeks.map((w,i)=>i+1))]; rr.prog.weeks.forEach((w,i)=>{ const m=g.rmByWeek[i+1]; if(m) w.rm=Object.assign({},m); }); via='Read as a table: '+g.weeks+' weeks, '+g.days+' days a week. Check it below.'; } } }
  if(!r){ const rr=L.parseAny(im.text); if(exCount(rr)>0) r=rr; }
  if(r){ im.res=r; im.res.name=r.prog.name; im.err=''; if(via) im.note=(im.note?im.note+'. ':'')+via; }
  else im.err=(im.err?im.err+' ':'')+'I could not recognise a program layout in that text. '+(apiKey()?'Tap Ask Claude to read it, or edit the text and tap Read it.':'You can edit the text and tap Read it, or add a Claude key in Plan, Settings so Ask Claude can read messy files.');
}
const CLAUDE_MODEL='claude-sonnet-5-5';
function loadLib(name){ return new Promise((res,rej)=>{ const id='lib-'+name; if(document.getElementById(id)) return res(); const sc=document.createElement('script'); sc.id=id; sc.src='lib/'+name+'.js'; sc.onload=()=>res(); sc.onerror=()=>{ sc.remove(); rej(new Error('Could not load '+name)); }; document.head.appendChild(sc); }); }
function fileB64(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=()=>rej(r.error); r.readAsDataURL(f); }); }
async function pdfText(f){
  await loadLib('pdf'); const pdfjs=window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc='lib/pdf.worker.js';
  const doc=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise; const out=[]; const items=[];
  for(let n=1;n<=doc.numPages;n++){ const pg=await doc.getPage(n); const tc=await pg.getTextContent(); const rows=new Map();
    tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; items.push({p:n,x:it.transform[4],y:-it.transform[5],w:it.width,h:it.height,t:it.str}); const y=Math.round(it.transform[5]/3); const r=rows.get(y)||[]; r.push({x:it.transform[4],s:it.str}); rows.set(y,r); });
    [...rows.keys()].sort((p,q)=>q-p).forEach(y=>out.push(rows.get(y).sort((p,q)=>p.x-q.x).map(i=>i.s).join('  ').trim())); out.push(''); }
  let text=out.join('\n').trim(); let ocr=false;
  if(text.length<20&&window.GK_OCR&&GK_OCR.available()){ const parts=[]; const n=Math.min(doc.numPages,30); items.length=0;
    for(let i=1;i<=n;i++){ S.ui.imp.note='Reading scanned page '+i+' of '+n+'...'; render(); const pg=await doc.getPage(i); const vp=pg.getViewport({scale:2}); const cv=document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height; await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise; const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.92)); const res=await GK_OCR.image(blob); parts.push(res.text); res.items.forEach(it=>{ it.p=i; items.push(it); }); }
    text=parts.join('\n\n').trim(); ocr=text.length>=20; }
  return {text,items,pages:doc.numPages,ocr};
}
async function sheetsFrom(f){
  await loadLib('xlsx'); const wb=window.XLSX.read(await f.arrayBuffer(),{type:'array'}); const im=S.ui.imp; im.wb=wb; im.sheets=wb.SheetNames.slice(); im.sheet=0; sheetToText();
}
function sheetToText(){ const im=S.ui.imp; const ws=im.wb.Sheets[im.sheets[im.sheet]]; im.text=window.XLSX.utils.sheet_to_csv(ws,{blankrows:false}); im.items=[]; window.XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''}).forEach((row,ri)=>row.forEach((v,ci)=>{ if(String(v).trim()) im.items.push({p:1,x:ci*100,w:90,y:ri*10,h:6,t:String(v)}); })); im.note=(im.fileName||'Spreadsheet')+', sheet "'+im.sheets[im.sheet]+'"'; }
async function impClaude(){
  const im=S.ui.imp; const key=apiKey(); if(!key){ im.err='Add your Claude key in Plan, Settings first.'; render(); return; }
  if(!im.text.trim()&&!im.images.length&&!im.pdf){ im.err='Paste some text or attach a file or photo first.'; render(); return; }
  im.busy=true; im.err=''; im.res=null; render();
  const prompt='You turn gym training programs into CSV. Reply with ONLY CSV, no commentary and no code fences. First line: NAME,<program name>. Second line is the header: week,day,exercise,sets,reps,load,rpe,note. One row per exercise per day per week. List every week separately even when weeks repeat, numbering weeks from 1. Put the day name in the day column (for example Lower, Upper, Pull). Reps may be a number or a range such as 8-10, or a time such as 60s. Keep loads exactly as written, including units (kg, lb), percentages and RPE text, and leave load empty if there is none. Put technique or intensity tags (such as EL, ES, tempo) and any coaching text into note. Start the exercise name with "A)" or "B)" for superset pairs. Quote any field that contains a comma. Do not invent exercises or numbers that are not in the source.';
  try{
    const content=[];
    if(im.pdf){ if(im.pdf.size>20*1024*1024) throw new Error('That PDF is over 20 MB.'); content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:await fileB64(im.pdf)}}); }
    for(const f of im.images){ content.push({type:'image',source:{type:'base64',media_type:/^image\/(png|jpeg|gif|webp)$/.test(f.type)?f.type:'image/jpeg',data:await fileB64(f)}}); }
    content.push({type:'text',text:prompt+((!im.pdf&&im.text.trim())?'\n\nProgram:\n'+im.text:'')});
    const ac=new AbortController(); const to=setTimeout(()=>ac.abort(),300000);
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ac.signal,headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:16000,messages:[{role:'user',content}]})});
    clearTimeout(to); const j=await r.json().catch(()=>({}));
    if(!r.ok){ const m=(j.error&&j.error.message)||''; throw new Error(r.status===401?'The key was rejected. Check it in Settings.':r.status===429?'Too many requests or out of credit. Try again shortly.':r.status===413?'The file is too large to send.':('Claude returned an error ('+r.status+'). '+m)); }
    let t=((j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('')||'').trim().replace(/^```[a-z]*\n?/i,'').replace(/```\s*$/,'').trim();
    let name='';
    const nm=t.match(/^NAME,(.*)\n/i); if(nm){ name=nm[1].replace(/^"|"$/g,'').trim(); t=t.slice(nm[0].length); }
    const res=L.parseAny(t); const warn=(res.warn||[]).slice(); if(res.prog){ warn.unshift('Read by Claude. Check the numbers against your sheet before saving.'); if(name) res.prog.name=name; }
    im.res={prog:res.prog,warn,name:name||(res.prog&&res.prog.name)||''}; if(j.stop_reason==='max_tokens') im.res.warn.push('The reply was cut off, so later weeks may be missing. Try a shorter section of the program.');
  }catch(e){ im.err=(e&&e.name==='AbortError')?'That took too long. Try a smaller file or fewer weeks.':('Could not read that: '+((e&&e.message)||'error')); }
  im.busy=false; render();
}
async function doDownload(name,data){
  try{ await S.cap.downloads.save({filename:name,data}); toast('Saved.'); }catch(e){ if(e&&e.code==='declined') return; toast('Could not save the file ('+((e&&e.code)||'error')+').'); }
}
function setPast(){ const v=(($('#logd')||{}).value||''); if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){ toast('Pick a date first.'); return false; } if(v>today()){ toast('That date is in the future.'); return false; } S.ui.logDate=v; return true; }
const H={
  tab:el=>{ S.tab=el.dataset.v; window.scrollTo(0,0); render(); },
  ask:el=>{ const id=el.dataset.id; if(S.ui.confirm===id){ S.ui.confirm=null; DO[el.dataset.do](el.dataset.arg); } else { S.ui.confirm=id; render(); clearTimeout(H._ct); H._ct=setTimeout(()=>{ if(S.ui.confirm===id){ S.ui.confirm=null; render(); } },4000); } },
  resume:()=>{ S.ui.inWorkout=true; window.scrollTo(0,0); render(); },
  leave:()=>{ saveActive(); S.ui.inWorkout=false; S.rest=null; render(); },
  startprog:el=>startProgram(+el.dataset.w,+el.dataset.d),
  skipday:()=>{ const p=activeProg(); if(!p) return; S.profile.ptr=L.advance(p,S.profile.ptr); saveProfile(); render(); },
  gotoplan:()=>{ const p=activeProg(); S.tab='plan'; S.ui.planTab='program'; S.ui.bpid=p?p.id:null; S.ui.bw=S.profile.ptr.w; S.ui.bd=S.profile.ptr.d; render(); },
  startfree:()=>startFree(),
  wulen:el=>{ S.profile.wu=el.dataset.v; saveProfile(); render(); },
  wuopen:()=>{ S.ui.wuOpen=!S.ui.wuOpen; render(); },
  wuon:()=>{ S.profile.wuOn=S.profile.wuOn===false; saveProfile(); render(); },
  wutick:el=>{ const a=S.active; a.wu=a.wu||{done:{}}; const k=el.dataset.k; a.wu.done[k]=!a.wu.done[k]; saveActive(); render(); },
  recset:el=>{ const t=today(); const r=(S.profile.rec[t]=S.profile.rec[t]||{}); const k=el.dataset.k,v=+el.dataset.v; r[k]=r[k]===v?undefined:v; if(r[k]===undefined) delete r[k]; const keys=Object.keys(S.profile.rec).sort(); while(keys.length>120) delete S.profile.rec[keys.shift()]; saveProfile(); render(); },
  cdset:el=>{ S.ui.cd[el.dataset.k]=el.dataset.v; render(); },
  cdadd:()=>{ const cd=S.ui.cd; const m=Math.round(+cd.min); const d=cd.date||today(); if(!(m>0)){ toast('Enter the minutes.'); return; } if(d>today()){ toast('That date is in the future.'); return; } S.profile.cardio.push({id:uid(),date:d,type:cd.type,min:m,effort:cd.effort}); S.ui.cd.min=''; saveProfile(); toast('Cardio added.'); render(); },
  msadd:()=>{ const m=S.ui.ms; const d=m.d||today(); if(d>today()){ toast('That date is in the future.'); return; } const e={id:uid(),d}; let any=false; ['waist','chest','arm','thigh'].forEach(k=>{ const v=parseFloat(m[k]); if(v>0){ e[k]=v; any=true; } }); if(!any){ toast('Enter at least one measurement.'); return; } S.profile.meas.push(e); S.ui.ms={d:'',waist:'',chest:'',arm:'',thigh:''}; saveProfile(); toast('Saved.'); render(); },
  msdel:el=>{ S.profile.meas=S.profile.meas.filter(x=>x.id!==el.dataset.id); saveProfile(); render(); },
  editsess:el=>{ const s=S.sessions.find(x=>x.id===el.dataset.id); if(!s) return;
    if(S.active){ toast('Finish or discard your workout in progress first.'); return; }
    const a={id:s.id,date:s.date,start:s.start,dur:s.dur,type:s.type,title:s.title,pid:s.pid,w:s.w,d:s.d,goal:s.goal,focus:s.focus,notes:s.notes||'',past:true,editing:true,
      ex:(s.ex||[]).map(e=>({id:uid(),name:e.name,key:e.key,ss:null,note:e.note||'',target:{sets:e.sets.length,repsText:'',lo:null,hi:null,rpe:null,raw:'',per:'',timed:false,rest:90},sets:e.sets.map(x=>({kg:x.kg||'',reps:x.reps,done:true,tr:''})),sug:null}))};
    S.active=a; S.ui.inWorkout=true; S.ui.summary=null; saveActive(); window.scrollTo(0,0); render(); },
  pastprog:()=>{ if(!setPast()) return; const p=S.profile.ptr; startProgram(p.w,p.d); },
  pastrz:()=>{ if(!S.ui.rz.plan){ toast('Build a session in Off the book first.'); return; } if(!setPast()) return; startRandom(); },
  pastfree:()=>{ if(!setPast()) return; startFree(); },
  rzset:el=>{ const k=el.dataset.k,v=el.dataset.v; S.ui.rz[k]=k==='time'?+v:v; if(S.ui.rz.plan) rzGen(false); render(); },
  rzwake:()=>{ S.ui.rz.wake=!S.ui.rz.wake; if(S.ui.rz.plan) rzGen(true); render(); },
  rzgen:()=>{ rzGen(false); render(); },
  rzshuffle:()=>{ rzGen(false); render(); },
  rzsurprise:()=>{ S.ui.rz.focus=leastTrained(); const g=['strength','size','define','general']; if(!S.ui.rz.goal) S.ui.rz.goal=g[0]; rzGen(false); toast('Focus picked: '+L.FOCUS.find(f=>f[0]===S.ui.rz.focus)[1]+', the least trained in the last 7 days.'); render(); },
  rzpreset:el=>{ const rz=S.ui.rz; if(el.dataset.p==='wake'){ rz.goal='general'; rz.focus='full'; rz.time=15; rz.wake=true; } else { rz.goal='general'; rz.focus='full'; rz.time=30; rz.wake=false; } rzGen(false); render(); },
  rzswap:el=>{ const rz=S.ui.rz; rz.seed=(rz.seed||1)+1; rz.plan=L.swapItem(rz.plan,+el.dataset.i,rz.seed,S.profile.eq); render(); },
  rzstart:()=>startRandom(),
  tick:el=>{ const i=+el.dataset.i,j=+el.dataset.j; const e=S.active.ex[i]; const s=e.sets[j]; s.done=!s.done;
    if(s.done){ if(s.reps===''&&s.tr!=='') s.reps=s.tr; startRest(e.target.rest||90); } saveActive(); render(); },
  addset:el=>{ const e=S.active.ex[+el.dataset.i]; const l=e.sets[e.sets.length-1]||{kg:'',tr:''}; e.sets.push({kg:l.kg,reps:'',done:false,tr:l.tr}); saveActive(); render(); },
  rmset:el=>{ const e=S.active.ex[+el.dataset.i]; if(e.sets.length>1){ e.sets.pop(); saveActive(); render(); } },
  usesug:el=>{ const e=S.active.ex[+el.dataset.i]; e.sets.forEach(s=>{ if(!s.done) s.kg=e.sug.kg; }); saveActive(); render(); },
  addex:()=>addExercise(),
  resttoggle:()=>{ S.profile.rest=!S.profile.rest; if(!S.profile.rest) S.rest=null; saveProfile(); render(); },
  rest30:()=>{ if(S.rest){ S.rest.end+=30000; S.rest.fired=false; S.rest.doneAt=0; tickClock(); } },
  restskip:()=>{ S.rest=null; tickClock(); },
  finish:()=>finishWorkout(),
  donesum:()=>{ S.ui.summary=null; S.tab='train'; window.scrollTo(0,0); render(); },
  plantab:el=>{ S.ui.planTab=el.dataset.v; render(); },
  pickprog:el=>{ S.ui.bpid=el.dataset.id; S.ui.bw=null; S.ui.bd=0; render(); },
  bweek:el=>{ S.ui.bw=+el.dataset.v; render(); },
  bday:el=>{ S.ui.bd=+el.dataset.v; render(); },
  setptr:el=>{ S.profile.ptr={w:+el.dataset.w,d:+el.dataset.d,done:false}; saveProfile(); toast('Set as your next session.'); render(); },
  useprog:el=>{ S.profile.activePid=el.dataset.id; S.profile.ptr={w:0,d:0,done:false}; S.ui.bw=0; S.ui.bd=0; saveProfile(); toast('Program is now active.'); render(); },
  impread:()=>{ const im=S.ui.imp; im.err=''; im.res=L.parseAny(im.text); if(im.res.prog) im.res.name=im.res.prog.name; render(); },
  impclaude:()=>impClaude(),
  loadp9:()=>{ const im=S.ui.imp; const r=L.parseDSL(P9_DSL); im.err=''; im.note=''; im.res={prog:r.prog,warn:r.warn||[],name:'Barry P9 (12 weeks)',startW:6}; render(); },
  impsheet:el=>{ const im=S.ui.imp; im.sheet=+el.dataset.v; sheetToText(); im.err=''; autoParse(); render(); },
  clearkey:()=>{ try{ localStorage.removeItem(LS_KEY_API); }catch(e){} toast('Key removed.'); render(); },
  impsave:el=>{ const im=S.ui.imp; if(!im.res||!im.res.prog) return; const p=im.res.prog; p.id=uid(); p.name=(im.res.name||p.name||'Program').trim()||'Program'; p.added=Date.now(); saveProgram(p);
    if(el.dataset.a==='1'){ S.profile.activePid=p.id; S.profile.ptr={w:im.res.startW||0,d:0,done:false}; saveProfile(); }
    S.ui.imp={text:'',res:null,busy:false,err:'',images:[]}; S.ui.planTab='program'; S.ui.bpid=p.id; S.ui.bw=0; S.ui.bd=0; toast('Program saved.'); render(); },
  cxall:()=>cxAll(),
  cx:el=>{ const c=el.closest('.card'); const col=lsGet(LS_COLL)||{}; const k=c.dataset.ck; const on=!c.classList.contains('cc'); c.classList.toggle('cc',on); if(on) col[k]=1; else delete col[k]; lsSet(LS_COLL,col); cxLabel(); const t=c.querySelector('h2,h3,.lbl'); el.setAttribute('aria-expanded',on?'false':'true'); el.setAttribute('aria-label',(on?'Expand ':'Minimise ')+(t?t.textContent.trim():'')); },
  setupdone:()=>{ S.profile.setup=true; saveProfile(); render(); },
  settarget:el=>{ S.profile.target=+el.dataset.v; saveProfile(); render(); },
  setday:el=>{ const v=+el.dataset.v; const a=S.profile.days||[]; S.profile.days=a.includes(v)?a.filter(x=>x!==v):a.concat(v); saveProfile(); render(); },
  seteq:el=>{ const k=el.dataset.v; S.profile.eq[k]=S.profile.eq[k]===false; saveProfile(); if(S.ui.rz.plan) rzGen(true); render(); },
  setprog:()=>{ S.profile.prog=S.profile.prog===false; saveProfile(); render(); },
  exportjson:()=>doDownload('gainskeeper-backup-'+today()+'.json',JSON.stringify({app:'gainskeeper',version:1,profile:S.profile,programs:S.programs,sessions:S.sessions},null,1)),
  exportcsv:()=>{ const rows=[['date','session','exercise','set','kg','reps']]; [...S.sessions].sort((a,b)=>a.date<b.date?-1:1).forEach(s=>(s.ex||[]).forEach(e=>(e.sets||[]).forEach((x,i)=>rows.push([s.date,s.title,e.name,i+1,x.kg,x.reps])))); doDownload('gainskeeper-sessions-'+today()+'.csv',rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n')); },
  fgoal:el=>{ S.profile.fuel.goal=el.dataset.v; saveProfile(); render(); },
  fsex:el=>{ S.profile.fuel.sex=el.dataset.v; saveProfile(); render(); },
  fwdel:el=>{ S.profile.weights=S.profile.weights.filter(w=>w.d!==el.dataset.d); saveProfile(); render(); },
  foodtoggle:()=>{ S.profile.foodOn=!S.profile.foodOn; saveProfile(); render(); },
  foodday:el=>{ S.ui.fuelDay=L.ymd(L.addDays(L.parseYmd(S.ui.fuelDay),+el.dataset.v)); render(); },
  foodadd:()=>{ const g=id=>($('#'+id)||{}).value||''; const n=g('fn').trim(); if(!n){ toast('Give the food a name.'); return; } const x={id:uid(),n,kcal:Math.round(+g('fk')||0),p:Math.round(+g('fp')||0),c:Math.round(+g('fc')||0),f:Math.round(+g('ff')||0)}; (S.profile.food[S.ui.fuelDay]=S.profile.food[S.ui.fuelDay]||[]).push(x); saveProfile(); render(); },
  foodquick:el=>{ let src=null; Object.keys(S.profile.food).sort().reverse().some(d=>S.profile.food[d].some(x=>{ if(x.n===el.dataset.n){ src=x; return true; } })); if(!src) return; (S.profile.food[S.ui.fuelDay]=S.profile.food[S.ui.fuelDay]||[]).push(Object.assign({},src,{id:uid()})); saveProfile(); render(); },
  fooddel:el=>{ const d=S.ui.fuelDay; S.profile.food[d]=(S.profile.food[d]||[]).filter(x=>x.id!==el.dataset.id); saveProfile(); render(); },
  libfilter:el=>{ S.ui.lib=el.dataset.v; render(); },
  libaddtoggle:()=>{ S.ui.libAdd=!S.ui.libAdd; render(); },
  libaddsave:()=>{ const t=($('#lt')||{}).value||''; if(!t.trim()){ toast('Add a title.'); return; } const u=(($('#lu')||{}).value||'').trim(); S.profile.customLib.push({id:'c'+uid(),title:t.trim(),url:/^https?:\/\//i.test(u)?u:'',note:(($('#ln')||{}).value||'').trim()}); S.ui.libAdd=false; S.ui.lib='mine'; saveProfile(); render(); }
};
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return; if(el.tagName==='A') ev.preventDefault(); const f=H[el.dataset.act]; if(f) f(el,ev); });
function readFileText(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.onerror=()=>rej(r.error); r.readAsText(file); }); }
const IN={
  apikey:(el,ph)=>{ if(ph!=='change') return; const v=el.value.trim(); if(!v) return; try{ localStorage.setItem(LS_KEY_API,v); toast('Key saved on this phone.'); }catch(e){ toast('Could not save the key.'); } render(); },
  setname:(el)=>{ S.profile.name=el.value.trim().slice(0,30); saveProfile(); },
  addex:(el)=>{ S.ui.addEx=el.value; },
  wdate:(el,ph)=>{ if(ph!=='change'||!S.active) return; let v=el.value; if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; if(v>today()) v=today(); S.active.date=v; S.active.past=!!S.active.editing||v!==today(); if(S.active.past) S.rest=null; saveActive(); render(); },
  cdmin:el=>{ S.ui.cd.min=el.value; },
  cddate:el=>{ S.ui.cd.date=el.value; },
  ms:el=>{ S.ui.ms[el.dataset.k]=el.value; },
  wnotes:el=>{ S.active.notes=el.value; saveActiveSoon(); },
  imptext:el=>{ S.ui.imp.text=el.value; },
  impname:el=>{ if(S.ui.imp.res) S.ui.imp.res.name=el.value; },
  impfile:async(el,ph)=>{ if(ph!=='change') return; const f=el.files&&el.files[0]; if(!f) return; const im=S.ui.imp; im.err=''; im.note=''; im.fileName=f.name; im.pdf=null; if(!/^image\//.test(f.type)){ im.items=[]; im.photoN=0; } im.sheets=null; im.wb=null; el.value='';
    try{
      if(/^image\//.test(f.type)){
        if(apiKey()) im.images.push(f);
        if(window.GK_OCR&&GK_OCR.available()){ im.note='Reading text from photo...'; render(); const res=await GK_OCR.image(f); const t=res.text; im.items=(im.items||[]).concat(res.items.map(i=>Object.assign(i,{p:(im.photoN=(im.photoN||0)+(i===res.items[0]?1:0))}))); im.text=(im.text&&im.text.trim()?im.text.trim()+'\n\n':'')+t; im.note='Photo read on this phone'+(apiKey()?' (also attached for Claude)':''); if(!t.trim()) im.err='No text found in that photo.'; }
        else if(apiKey()) im.note='Photo added for Claude';
        else im.err='Reading photos needs the Android app, or a Claude key in Plan, Settings.';
      }
      else if(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name)){ im.pdf=f; let txt={text:'',pages:0}; try{ txt=await pdfText(f); }catch(e){} im.text=txt.text; im.items=txt.items; im.note=f.name+(txt.pages?', '+txt.pages+' pages':'')+(txt.ocr?', read as a scan':''); if(!txt.text) im.err=apiKey()?'No text found in that PDF. Use Ask Claude to read it.':'No text found in that PDF, it may be scanned. Add a Claude key in Settings to read it.'; }
      else if(/\.(xlsx|xls)$/i.test(f.name)) await sheetsFrom(f);
      else im.text=await readFileText(f);
    }catch(e){ im.err='Could not read that file.'; }
    autoParse();
    render(); },
  restore:async(el,ph)=>{ if(ph!=='change') return; const f=el.files&&el.files[0]; if(!f) return; try{ const d=JSON.parse(await readFileText(f)); let a=0,b=0;
      (d.programs||[]).forEach(p=>{ if(p&&p.id&&!S.programs.some(x=>x.id===p.id)){ saveProgram(p); a++; } });
      (d.sessions||[]).forEach(s=>{ if(s&&s.id&&!S.sessions.some(x=>x.id===s.id)){ saveSession(s); b++; } });
      if(d.profile){ const dp=d.profile, p=S.profile, fresh=!S.sessions.length&&S.programs.length>0&&a===S.programs.length;
        if(!p.setup||fresh){ ['name','target','days','eq','fuel','wu','wuOn','prog','rest'].forEach(k=>{ if(dp[k]!==undefined) p[k]=dp[k]; }); if(dp.activePid&&S.programs.some(x=>x.id===dp.activePid)){ p.activePid=dp.activePid; if(dp.ptr) p.ptr=dp.ptr; } p.setup=true; }
        Object.keys(dp.rec||{}).forEach(k=>{ if(!p.rec[k]) p.rec[k]=dp.rec[k]; });
        (dp.cardio||[]).forEach(c=>{ if(!p.cardio.some(x=>x.date===c.date&&x.min===c.min&&x.type===c.type)) p.cardio.push(c); });
        (dp.meas||[]).forEach(m=>{ if(!p.meas.some(x=>x.d===m.d)) p.meas.push(m); }); saveProfile(); }
      if(d.profile&&d.profile.weights){ d.profile.weights.forEach(w=>{ if(!S.profile.weights.some(x=>x.d===w.d)) S.profile.weights.push(w); }); saveProfile(); }
      toast('Restored '+b+' sessions and '+a+' programs.'); render(); }catch(e){ toast('That file did not look like a Gainskeeper backup.'); } },
  progkey:(el,ph)=>{ if(ph==='change'){ S.ui.progKey=el.value; render(); } },
  fuel:(el,ph)=>{ const k=el.dataset.k; let v=el.value; if(el.tagName==='SELECT'||['act','rate','meals','fat'].includes(k)) v=parseFloat(v); S.profile.fuel[k]=v; const o=$('#fuelout'); if(o) o.innerHTML=fuelOut(); if(ph==='change'){ saveProfile(); render(); } },
  fuelw:(el,ph)=>{ if(ph!=='change') return; const v=parseFloat(el.value); if(!(v>0)) return; const d=today(); const w=S.profile.weights.find(x=>x.d===d); if(w) w.kg=v; else S.profile.weights.push({d,kg:v}); saveProfile(); render(); },
  libread:(el)=>{ S.profile.libRead[el.dataset.id]=el.checked; saveProfile(); },
  libnote:(el)=>{ S.profile.libNotes[el.dataset.id]=el.value; saveProfile(); }
};
document.addEventListener('input',ev=>{ const el=ev.target;
  if(el.dataset&&el.dataset.set){ const e=S.active&&S.active.ex[+el.dataset.i]; if(e){ const j=+el.dataset.j,f=el.dataset.f; const old=e.sets[j][f]; e.sets[j][f]=el.value;
      if(f==='kg'){ for(let k=j+1;k<e.sets.length;k++){ const o=e.sets[k]; if(!o.done&&String(o.kg)===String(old)){ o.kg=el.value; const inp=document.querySelector('[data-set][data-i="'+el.dataset.i+'"][data-j="'+k+'"][data-f="kg"]'); if(inp) inp.value=el.value; } else break; } }
      saveActiveSoon(); } return; }
  const f=el.dataset&&el.dataset.in; if(f==='fuel'||f==='cdmin'||f==='cddate'||f==='ms'||f==='libnote'||f==='addex'||f==='wnotes'||f==='imptext'||f==='impname') IN[f](el,'input'); });
document.addEventListener('change',ev=>{ const el=ev.target; const f=el.dataset&&el.dataset.in; if(f&&IN[f]) IN[f](el,'change'); });
setInterval(tickClock,500);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) tickClock(); });
/* ---------- init ---------- */
loadLocal(); if(S.active) S.ui.inWorkout=false; render(); connect();
})();
