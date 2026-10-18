/* LOGIC:START */
const LOGIC=(function(){
const UP=new Set(['BB','DB','KB','EZ','RDL','RDLS','DL','OHP','NG','TNG','AB','RPE','EL','ES','HEX','TRX']);
const ALIAS={'bench':'bench press','bb bench press':'bench press','barbell bench press':'bench press','squat':'back squat','bb squat':'back squat','barbell back squat':'back squat','incline bench':'incline bench press','bb incline bench press':'incline bench press','ohp':'overhead press','strict press':'overhead press','dl':'deadlift','bb deadlift':'deadlift','rdl':'romanian deadlift','bb rdl':'romanian deadlift','hip thrust':'bb hip thrust','barbell hip thrust':'bb hip thrust','close grip bench press tng':'close grip bench press','dumbbell floor press':'db floor press','kb goblet squat':'goblet squat','db goblet squat':'goblet squat','bodyweight sissy squat':'sissy squat','bb pendlay row':'pendlay row','ez bar bicep curl':'ez bar curl','bb good morning':'good morning','barbell row':'barbell row','bb row':'barbell row'};
function keyOf(n){
  let s=String(n||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/^[ab]\)\s*/,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  s=s.split(' ').map(w=>(w.length>2&&w.endsWith('s')&&!/(ss|us|is)$/.test(w))?w.slice(0,-1):w).join(' ');
  return ALIAS[s]||s;
}
function prettify(n){
  let s=String(n||'').trim(); let note='';
  s=s.replace(/\(([^)]*)\)/g,(m,t)=>{ if(t.trim().length>12){ note=t.trim().toLowerCase().replace(/^./,c=>c.toUpperCase()); return ''; } return m; }).replace(/\*/g,'').replace(/\s+/g,' ').trim();
  const out=s.split(' ').map(w=>{ const core=w.replace(/[^A-Za-z]/g,'').toUpperCase(); if(UP.has(core)) return w.toUpperCase(); return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase(); }).join(' ');
  return {name:out,note};
}
const r25=x=>Math.round(x*4)/4;
function parseLoad(text,key){
  const o={kg:null,rpe:null,guess:null,raw:(text||'').trim()};
  let t=o.raw; if(!t) return o;
  const m=t.match(/RPE\s*([\d.]+)/i); if(m){ o.rpe=parseFloat(m[1]); t=t.replace(m[0],' '); }
  if(/band|purp|\bez\b|bandito/i.test(t)) return o;
  if(o.rpe!=null){ const g=t.match(/\(?\s*([\d.]+)\s*\)?/); if(g) o.guess=parseFloat(g[1]); return o; }
  t=t.replace(/\([^)]*\)/g,' ');
  const n=t.match(/([\d.]+)\s*(kgs?|lbs?)?/i); if(!n) return o;
  let v=parseFloat(n[1]); if(!isFinite(v)||v<=0) return o;
  const u=(n[2]||'').toLowerCase();
  if(/^pull up|^chin up|^dip$/.test(key||'')&&!u) return o;
  if(u.startsWith('lb')) v=r25(v*0.4536);
  o.kg=v; return o;
}
function parseCell(cell,prev){
  cell=(cell||'').trim();
  let m=cell.match(/^(\d+)\s*x\s*([^;]*?)\s*(?:;\s*(.*))?$/i);
  let p=null;
  if(m){
    p={sets:+m[1],repsText:m[2].trim(),loadRaw:(m[3]||'').trim()};
  } else if((m=cell.match(/^(\d+(?:\s*,\s*\d+)+)\s*(?:;\s*(.*))?$/))){
    const l=m[1].split(',').map(x=>+x.trim());
    p={sets:l.length,repsList:l,repsText:l.join('/'),loadRaw:(m[2]||'').trim()};
  } else if(prev){
    p={sets:prev.sets,repsText:prev.repsText,repsList:prev.repsList,loadRaw:cell};
  } else return null;
  const rt=p.repsText||''; p.per=/\bEL\b|\d\s*EL\b/i.test(rt)?'EL':(/\bES\b|\d\s*ES\b/i.test(rt)?'ES':'');
  if(/^\d+s$/i.test(rt)){ p.timed=true; p.reps=parseInt(rt,10); p.repsText=p.reps+' sec'; }
  else if(/max/i.test(rt)){ p.timed=true; p.reps=null; p.repsText='Max'+(p.per?' '+p.per:''); }
  else if(p.repsList){ p.reps=p.repsList[0]; }
  else { const n=rt.match(/\d+/); p.reps=n?+n[0]:null; if(p.per) p.repsText=p.reps+' '+p.per; }
  return p;
}
function buildEx(nameRaw,p,note){
  let ss=null; const sm=String(nameRaw).match(/^([AB])\)\s*(.*)$/); if(sm){ ss=sm[1]; nameRaw=sm[2]; }
  const pr=prettify(nameRaw); const key=keyOf(nameRaw);
  const L=parseLoad(p.loadRaw,key);
  return {name:pr.name,key,ss,note:[pr.note,note].filter(Boolean).join('. '),sets:p.sets,reps:p.reps==null?null:p.reps,repsList:p.repsList||null,repsText:p.repsText,per:p.per||'',timed:!!p.timed,rpe:L.rpe,kg:L.kg,guess:L.guess,raw:L.raw};
}
function parseDSL(text){
  const prog={name:'Imported program',weeks:[],src:'dsl'}; const warn=[];
  let block=null,dayIdx=-1;
  for(const rawLine of String(text).split(/\r?\n/)){
    let line=rawLine.trim(); if(!line||line[0]==='#') continue;
    let m;
    if((m=line.match(/^NAME\s+(.*)$/i))){ prog.name=m[1].trim(); continue; }
    if(/^BLOCK\b/i.test(line)){
      const parts=line.split('|').map(x=>x.trim()); const rm={}; let weeks=6;
      (parts[1]||'').split(/\s+/).forEach(kv=>{ const q=kv.split('='); if(q.length===2&&q[0]) rm[q[0].toLowerCase()]=parseFloat(q[1]); });
      const w=(parts[2]||'').match(/weeks\s*=\s*(\d+)/i); if(w) weeks=+w[1];
      const start=prog.weeks.length; for(let i=0;i<weeks;i++) prog.weeks.push({n:start+i+1,days:[],rm});
      block={start,weeks,rm}; dayIdx=-1; continue;
    }
    if(!block){ warn.push('Line before BLOCK ignored: '+line.slice(0,40)); continue; }
    if((m=line.match(/^DAY\s+(.*)$/i))){ dayIdx++; for(let i=0;i<block.weeks;i++) prog.weeks[block.start+i].days.push({name:m[1].trim(),ex:[]}); continue; }
    if(dayIdx<0){ warn.push('Row before DAY ignored: '+line.slice(0,40)); continue; }
    let note=''; const ci=line.indexOf('//'); if(ci>=0){ note=line.slice(ci+2).trim(); line=line.slice(0,ci).trim(); }
    const cells=line.split('|').map(x=>x.trim()); const name=cells.shift();
    let cs=cells; if(cs.length===1) cs=Array(block.weeks).fill(cs[0]);
    if(cs.length!==block.weeks){ warn.push(name+': expected '+block.weeks+' cells, got '+cs.length); while(cs.length<block.weeks) cs.push(cs[cs.length-1]||''); cs=cs.slice(0,block.weeks); }
    let prev=null;
    cs.forEach((c,i)=>{ const p=parseCell(c,prev); if(!p){ warn.push(name+' week '+(i+1)+': could not read "'+c+'"'); return; } prev=p; prog.weeks[block.start+i].days[dayIdx].ex.push(buildEx(name,p,note)); });
  }
  return {prog,warn};
}
function splitCSV(line){ const out=[]; let cur='',q=false; for(let i=0;i<line.length;i++){ const c=line[i]; if(q){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; } else if(c==='"') q=true; else if(c===','){ out.push(cur); cur=''; } else cur+=c; } out.push(cur); return out.map(x=>x.trim()); }
function repsInfo(s){ s=String(s==null?'':s).trim(); const nums=(s.match(/\d+/g)||[]).map(Number); if(!nums.length) return {lo:null,hi:null,reps:null,repsText:s||''}; return {lo:nums[0],hi:nums[nums.length-1],reps:nums[nums.length-1],repsText:s}; }
function exFromPlain(o){
  let nm=String(o.name||'Exercise'); let ssl=o.ss||null; const sm=nm.match(/^([AB])\)\s*(.*)$/i); if(sm){ ssl=sm[1].toUpperCase(); nm=sm[2]; }
  const pr=prettify(nm); const key=keyOf(nm);
  const ri=repsInfo(o.reps); const L=parseLoad(o.load==null?'':String(o.load),key);
  const rpe=o.rpe!=null&&o.rpe!==''?parseFloat(o.rpe):L.rpe;
  return {name:pr.name,key,ss:ssl,note:[pr.note,o.note].filter(Boolean).join('. '),sets:Math.max(1,parseInt(o.sets,10)||3),reps:ri.reps,repsList:null,repsText:ri.repsText,per:'',timed:false,rpe:isFinite(rpe)?rpe:null,kg:L.kg,guess:L.guess,raw:L.raw};
}
function parseCSV(text){
  const lines=String(text).split(/\r?\n/).filter(l=>l.trim()); if(!lines.length) return {prog:null,warn:['Empty']};
  const head=splitCSV(lines.shift()).map(h=>h.toLowerCase()); const ix=n=>head.indexOf(n);
  if(ix('exercise')<0) return {prog:null,warn:['CSV needs a header row with at least: week,day,exercise,sets,reps']};
  const weeks=new Map(); const warn=[];
  lines.forEach(l=>{ const c=splitCSV(l); const w=parseInt(c[ix('week')],10)||1; const d=c[ix('day')]||'Day 1';
    if(!weeks.has(w)) weeks.set(w,new Map()); const dm=weeks.get(w); if(!dm.has(d)) dm.set(d,[]);
    dm.get(d).push(exFromPlain({name:c[ix('exercise')],sets:c[ix('sets')],reps:c[ix('reps')],load:ix('load')>=0?c[ix('load')]:'',rpe:ix('rpe')>=0?c[ix('rpe')]:'',note:ix('note')>=0?c[ix('note')]:''})); });
  const prog={name:'Imported program',weeks:[],src:'csv'};
  [...weeks.keys()].sort((a,b)=>a-b).forEach((w,i)=>{ prog.weeks.push({n:i+1,rm:{},days:[...weeks.get(w).entries()].map(([name,ex])=>({name,ex}))}); });
  return {prog,warn};
}
function normProgram(o){
  const weeks=(o.weeks||[]).map((w,i)=>({n:i+1,rm:w.rm||{},days:(w.days||[]).map((d,j)=>({name:d.name||('Day '+(j+1)),ex:(d.exercises||d.ex||[]).map(e=>e.key&&e.sets!=null&&e.repsText!=null?e:exFromPlain(e))}))}));
  return {name:o.name||'Imported program',weeks,src:o.src||'json'};
}
function parseAny(text){
  const t=String(text||'').trim(); if(!t) return {prog:null,warn:['Nothing to read']};
  if(t[0]==='{'||t[0]==='['){ try{ let o=JSON.parse(t); if(Array.isArray(o)) o={weeks:o}; const p=normProgram(o); return {prog:p,warn:p.weeks.length?[]:['No weeks found']}; }catch(e){ return {prog:null,warn:['That looks like JSON but did not parse: '+e.message]}; } }
  if(/^(NAME|BLOCK)\b/im.test(t)) return parseDSL(t);
  return parseCSV(t);
}

/* ---- grid reader: tables with a name column and RANGE/LOAD column pairs per week ---- */
function parseGrid(items){
  const warn=[]; if(!items||!items.length) return {csv:'',weeks:0,warn:['No text found']};
  // merge "WEEK" + number split into two items
  let its=items.filter(i=>i&&i.t&&String(i.t).trim()).map(i=>({p:i.p||1,x:i.x,w:i.w||0,y:i.y,h:i.h||0,t:String(i.t).trim()}));
  its.sort((a,b)=>a.p-b.p||a.y-b.y||a.x-b.x);
  const hs=its.map(i=>i.h).filter(h=>h>0).sort((a,b)=>a-b); const tol=Math.max(1.5,(hs.length?hs[hs.length>>1]:6)*0.55);
  const rows=[]; its.forEach(i=>{ const r=rows[rows.length-1]; if(r&&r.p===i.p&&Math.abs(i.y-r.y)<=tol){ r.it.push(i); r.y=(r.y*(r.it.length-1)+i.y)/r.it.length; } else rows.push({p:i.p,y:i.y,it:[i]}); });
  rows.forEach(r=>{ r.it.sort((a,b)=>a.x-b.x); const m=[]; r.it.forEach(i=>{ const l=m[m.length-1]; if(l&&/^week$/i.test(l.t)&&/^\d+$/.test(i.t)){ l.t='WEEK '+i.t; l.w=i.x+i.w-l.x; } else m.push(Object.assign({},i)); }); r.it=m; r.cx=r.it.map(i=>i.x+i.w/2); });
  const isW=i=>/^week\s*\d+$/i.test(i.t), isR=i=>/^range$/i.test(i.t), isL=i=>/^load$/i.test(i.t);
  let weekLbl=null, rm={}, cols=null, nameMax=0, day=-1, prev=null, prevY=0; const data=[]; const blocks=[]; let blockStart=true;
  const LIFT=/^(squat|bench|deadlift|ohp|press|overhead)$/i;
  rows.forEach(r=>{
    const wl=r.it.filter(isW);
    if(wl.length>=2){ weekLbl=wl.map(i=>({n:+i.t.match(/\d+/)[0],cx:i.x+i.w/2})); day=-1; prev=null; return; }
    const rg=r.it.filter(isR), ld=r.it.filter(isL);
    if(rg.length>=2){
      day++; prev=null; const pairs=rg.map((g,k)=>{ const l=ld.filter(q=>q.x>g.x&&(!rg[k+1]||q.x<rg[k+1].x))[0]; return {rx:g.x+g.w/2,lx:l?l.x+l.w/2:g.x+g.w/2+40}; });
      const wk=pairs.map((pr,k)=>{ if(weekLbl&&weekLbl.length===pairs.length) return weekLbl[k].n; if(weekLbl){ let best=null,bd=1e9; weekLbl.forEach(w=>{ const d=Math.abs(w.cx-(pr.rx+pr.lx)/2); if(d<bd){bd=d;best=w;} }); return best.n; } return k+1; });
      cols={pairs,wk,hdr:[].concat(...pairs.map((pr,k)=>[{cx:pr.rx,k,kind:'r'},{cx:pr.lx,k,kind:'l'}]))}; nameMax=rg[0].x-12; return; }
    // 1RM line
    const txt=r.it.map(i=>i.t).join(' ');
    if(/1\s*rm/i.test(txt)&&!cols){ }
    if(/1\s*rms?\b/i.test(txt)&&r.it.some(i=>LIFT.test(i.t))){ rm={}; r.it.forEach((i,k)=>{ const nx=r.it[k+1]; if(LIFT.test(i.t)&&nx&&/^\d+(\.\d+)?$/.test(nx.t)) rm[i.t.toLowerCase()]=parseFloat(nx.t); }); cols=null; return; }
    if(!cols) return;
    const nameIt=r.it.filter(i=>i.x<nameMax), cellIt=r.it.filter(i=>i.x>=nameMax);
    if(!nameIt.length&&!cellIt.length) return;
    if(!cellIt.length){ const nm=nameIt.map(i=>i.t).join(' ').trim(); if(prev&&!/^\*/.test(nm)&&r.y-prevY<tol*3.2){ prev.name+=' '+nm; prevY=r.y; } return; }
    if(!nameIt.length) return;
    const cells=cols.pairs.map(()=>({r:[],l:[]}));
    cellIt.forEach(i=>{ const cx=i.x+i.w/2; let best=null,bd=1e9; cols.hdr.forEach(h=>{ const d=Math.abs(h.cx-cx); if(d<bd){bd=d;best=h;} }); cells[best.k][best.kind].push(i.t); });
    const row={name:nameIt.map(i=>i.t).join(' ').trim(),day:day<0?0:day,wk:cols.wk,cells:cells.map(c=>({r:c.r.join(' ').trim(),l:c.l.join(' ').trim()})),rm:Object.assign({},rm)}; data.push(row); prev=row; prevY=r.y;
  });
  if(!data.length) return {csv:'',weeks:0,warn:['Could not find a table with RANGE and LOAD columns']};
  const q=v=>/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
  const out=[]; const weeksSeen=new Set(); const rmByWeek={};
  const dayName={}; data.forEach(d=>{ if(dayName[d.day]===undefined){ const w=d.name.replace(/^[AB]\)\s*/i,'').split(/\s+/).slice(0,2).join(' ').toLowerCase(); dayName[d.day]='Day '+(d.day+1)+' ('+w+')'; } });
  data.forEach(row=>{ row.wk.forEach(n=>{ if(Object.keys(row.rm).length&&!rmByWeek[n]) rmByWeek[n]=row.rm; }); });
  data.forEach(row=>{ row.cells.forEach((c,k)=>{ const wkn=row.wk[k]; if(!c.r) return; weeksSeen.add(wkn);
    let rest=c.r.replace(/\s+/g,''), sets='', reps='', note=[];
    let m=rest.match(/^(\d+)[xX×](.+)$/);
    if(m){ sets=m[1]; reps=m[2]; } else if(/^\d+(,\d+)+$/.test(rest)){ sets=String(rest.split(',').length); reps=rest; } else { reps=rest; }
    const tg=reps.match(/(EL|ES)$/i); if(tg&&/\d/.test(reps.slice(0,-2))){ note.push(tg[1].toUpperCase()); reps=reps.slice(0,-2); }
    reps=reps.replace(/MIN/gi,'min').replace(/SEC/gi,'s');
    let load=c.l, rpe='';
    const rp=load.match(/^RPE\s*([\d.]+)\s*(?:\(([^)]*)\))?\s*(.*)$/i); if(rp){ rpe=rp[1]; load=(rp[2]||rp[3]||'').trim(); }
    const tg2=load.match(/\s*\b(ES|EL)\b\s*$/i); if(tg2){ note.push(tg2[1].toUpperCase()); load=load.slice(0,tg2.index).trim(); }
    out.push([wkn,dayName[row.day],row.name,sets,reps,load,rpe,note.join(' ')].map(v=>q(String(v))).join(','));
  }); });
  return {rmByWeek,csv:'week,day,exercise,sets,reps,load,rpe,note\n'+out.join('\n'),weeks:weeksSeen.size,days:Math.max(...data.map(d=>d.day))+1,rows:out.length,warn};
}
/* ---- maths ---- */
const e1rm=(kg,reps)=>{ kg=+kg; reps=+reps; if(!(kg>0)||!(reps>0)) return 0; return reps<=1?kg:kg*(1+reps/30); };
const roundTo=(x,s)=>{ const v=Math.round(x/s)*s; return Math.round(v*100)/100; };
function stepFor(eqKey){ return eqKey==='db'||eqKey==='kb'||eqKey==='cable'||eqKey==='mach'?1:2.5; }
function sugLoad(e1,reps,rpe,step){ if(!(e1>0)) return null; const r=reps+(10-(rpe||8)); return Math.max(step,roundTo(e1/(1+r/30),step)); }
function progress(last,lo,hi,step){
  // last: [{kg,reps}] done sets. Double progression.
  const sets=last.filter(s=>s.kg>0&&s.reps>0); if(!sets.length) return null;
  const kg=Math.max(...sets.map(s=>s.kg)); const atKg=sets.filter(s=>s.kg===kg);
  const allTop=atKg.length>=Math.min(2,sets.length)&&atKg.every(s=>s.reps>=hi);
  if(allTop){ const inc=Math.max(step,roundTo(kg*0.025,step)); return {kg:roundTo(kg+inc,0.25),reps:lo,note:'Hit '+hi+' on every set. Add load (about 2.5%) and restart at '+lo+'.'}; }
  const minR=Math.min(...atKg.map(s=>s.reps)); return {kg,reps:Math.min(hi,minR+1),note:'Same load, aim for '+Math.min(hi,minR+1)+' on each set before adding weight.'};
}
/* ---- dates ---- */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseYmd=s=>{ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays=(d,n)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); return x; };
const mondayOf=d=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const wd=(x.getDay()+6)%7; return addDays(x,-wd); };
function weekCounts(sessions,now,nWeeks){
  const mon=mondayOf(now); const out=[];
  for(let i=nWeeks-1;i>=0;i--){ const s=addDays(mon,-7*i); const e=addDays(s,7); const k0=ymd(s),k1=ymd(e); out.push({start:k0,count:sessions.filter(x=>x.date>=k0&&x.date<k1).length}); }
  return out;
}
function streak(sessions,now,target){
  const need=Math.max(1,target-1); const wc=weekCounts(sessions,now,60).reverse(); let n=0;
  for(let i=0;i<wc.length;i++){ if(wc[i].count>=need) n++; else if(i===0) continue; else break; }
  return n;
}
function plateCount(total){ return Math.min(12,Math.floor(total/10)); }
/* ---- history ---- */
function buildHist(sessions){
  const h={}; const sorted=[...sessions].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.start||0)-(a.start||0));
  sorted.forEach(s=>(s.ex||[]).forEach(e=>{ const done=(e.sets||[]).filter(x=>x.done&&+x.kg>0&&+x.reps>0); if(!done.length) return; const best=Math.max(...done.map(x=>e1rm(x.kg,x.reps))); const topKg=Math.max(...done.map(x=>+x.kg)); (h[e.key]=h[e.key]||[]).push({date:s.date,sid:s.id,sets:done.map(x=>({kg:+x.kg,reps:+x.reps})),e1:best,topKg,name:e.name}); }));
  return h;
}
function prsFor(session,sessions){
  const prior=buildHist(sessions.filter(s=>s.id!==session.id&&(s.date<session.date||(s.date===session.date&&(s.start||0)<(session.start||0)))));
  const out=[];
  (session.ex||[]).forEach(e=>{ const done=(e.sets||[]).filter(x=>x.done&&+x.kg>0&&+x.reps>0); if(!done.length) return;
    const best=Math.max(...done.map(x=>e1rm(x.kg,x.reps))); const top=Math.max(...done.map(x=>+x.kg)); const p=prior[e.key];
    if(!p||!p.length){ out.push({name:e.name,key:e.key,type:'baseline',e1:best,kg:top}); return; }
    const pe=Math.max(...p.map(x=>x.e1)); const pk=Math.max(...p.map(x=>x.topKg));
    if(best>pe*1.0049) out.push({name:e.name,key:e.key,type:'pr',e1:best,prev:pe,kg:top});
    else if(top>pk) out.push({name:e.name,key:e.key,type:'weight',e1:best,prev:pk,kg:top});
  });
  return out;
}
function sessionVolume(s){ let v=0; (s.ex||[]).forEach(e=>(e.sets||[]).forEach(x=>{ if(x.done&&+x.kg>0&&+x.reps>0) v+=x.kg*x.reps; })); return Math.round(v); }
/* ---- program pointer ---- */
function advance(prog,ptr){ let w=ptr.w,d=ptr.d+1; const days=prog.weeks[w]?prog.weeks[w].days.length:0; if(d>=days){ w++; d=0; } if(w>=prog.weeks.length) return {w:prog.weeks.length-1,d:Math.max(0,(prog.weeks[prog.weeks.length-1]||{days:[]}).days.length-1),done:true}; return {w,d,done:false}; }
/* ---- randomiser ---- */
const GOALS={
  strength:{label:'Strength',main:[3,6],acc:[6,10],mSets:4,aSets:3,mRest:180,aRest:90,rpe:8,why:'Heavier loads in the 3 to 6 rep range with longer rests, then moderate accessory work.'},
  size:{label:'Size',main:[6,10],acc:[10,15],mSets:3,aSets:3,mRest:120,aRest:75,rpe:8.5,why:'Moderate reps close to failure, with enough weekly sets per muscle.'},
  define:{label:'Define',main:[8,12],acc:[12,20],mSets:3,aSets:3,mRest:75,aRest:45,rpe:8.5,why:'Higher reps and shorter rests keep the session dense. Fat loss comes from the energy deficit, not the session.'},
  stamina:{label:'Stamina',main:[15,25],acc:[15,25],mSets:3,aSets:3,mRest:40,aRest:30,rpe:7,why:'Light to moderate loads, high reps and short rests, set up as circuits.'},
  general:{label:'General',main:[8,12],acc:[10,15],mSets:3,aSets:3,mRest:90,aRest:60,rpe:8,why:'A balanced mix of moderate reps and moderate rests.'}
};
const FOCUS=[['full','Full body'],['legs','Legs'],['glutes','Glutes'],['back','Back'],['chest','Chest'],['shoulders','Shoulders'],['arms','Arms'],['core','Core'],['push','Push'],['pull','Pull'],['upper','Upper'],['lower','Lower']];
const PLANS={
  full:[['squat','hinge'],['hpush','incpush'],['hinge','squat','lunge'],['hpull','vpull'],['vpush'],['core']],
  legs:[['squat'],['hinge'],['lunge'],['quad','ham'],['calf'],['core']],
  glutes:[['hinge'],['glute'],['lunge'],['glute'],['ham'],['core']],
  back:[['vpull'],['hpull'],['hpull','vpull'],['rdelt'],['bicep'],['trap']],
  chest:[['hpush'],['incpush'],['fly'],['hpush','incpush'],['tri'],['fly']],
  shoulders:[['vpush'],['lat'],['rdelt'],['vpush','incpush'],['lat'],['trap']],
  arms:[['bicep'],['tri'],['bicep'],['tri'],['bicep'],['tri']],
  core:[['core'],['core'],['core'],['core'],['core'],['core']],
  push:[['hpush'],['vpush'],['incpush'],['lat'],['tri'],['fly']],
  pull:[['vpull'],['hpull'],['rdelt'],['bicep'],['hpull'],['trap']],
  upper:[['hpush'],['hpull'],['vpush'],['vpull'],['bicep'],['tri']],
  lower:[['squat'],['hinge'],['lunge'],['ham'],['calf'],['core']]
};
const CIRCUIT={full:[['squat','cond'],['hpush'],['hinge','cond'],['hpull'],['cond'],['core']]};
const X=(n,t,q,c,o)=>Object.assign({n,t,q,c:!!c},o||{});
const DB=[
 X('Back Squat','squat','bb',1),X('Front Squat','squat','bb',1),X('Goblet Squat','squat','kb',1),X('Leg Press','squat','mach',1),X('Bodyweight Squat','squat','bw'),
 X('Deadlift','hinge','bb',1),X('Romanian Deadlift','hinge','bb',1),X('DB Romanian Deadlift','hinge','db',1),X('Kettlebell Swing','hinge','kb',1),X('Good Morning','hinge','bb'),X('Back Extension','hinge','bw'),
 X('Walking DB Lunge','lunge','db'),X('Reverse Lunge','lunge','db'),X('Bulgarian Split Squat','lunge','db'),X('DB Step Up','lunge','db'),X('Bodyweight Lunge','lunge','bw'),
 X('Leg Extension','quad','mach'),X('Sissy Squat','quad','bw'),X('Leg Curl','ham','mach'),X('Nordic Curl','ham','bw'),
 X('BB Hip Thrust','glute','bb',1),X('Glute Bridge','glute','bw'),X('Cable Pull Through','glute','cable'),X('Single Leg Hip Thrust','glute','bw'),
 X('Standing Calf Raise','calf','mach'),X('Single Leg Calf Raise','calf','bw'),
 X('Bench Press','hpush','bb',1),X('DB Bench Press','hpush','db',1),X('Push Up','hpush','bw',1),X('Machine Chest Press','hpush','mach',1),X('Close Grip Bench Press','hpush','bb',1),X('Dip','hpush','bw',1),
 X('Incline Bench Press','incpush','bb',1),X('DB Incline Press','incpush','db',1),X('Incline Push Up','incpush','bw'),
 X('DB Pec Flye','fly','db'),X('Cable Fly','fly','cable'),X('Pec Deck','fly','mach'),
 X('Overhead Press','vpush','bb',1),X('DB Shoulder Press','vpush','db',1),X('Arnold Press','vpush','db'),X('Push Press','vpush','bb',1),X('Kettlebell Press','vpush','kb',1),X('Pike Push Up','vpush','bw'),
 X('DB Lateral Raise','lat','db'),X('Cable Lateral Raise','lat','cable'),
 X('Face Pull','rdelt','cable'),X('Rear Delt Flye','rdelt','db'),X('Reverse Pec Deck','rdelt','mach'),
 X('Triceps Pushdown','tri','cable'),X('EZ Bar Skull Crusher','tri','bb'),X('Overhead Triceps Extension','tri','db'),X('Bench Dip','tri','bw'),X('Diamond Push Up','tri','bw'),
 X('Pull Up','vpull','bw',1),X('Chin Up','vpull','bw',1),X('Lat Pulldown','vpull','cable',1),
 X('Barbell Row','hpull','bb',1),X('Pendlay Row','hpull','bb',1),X('One Arm DB Row','hpull','db',1),X('Inverted Row','hpull','bw',1),X('Seated Cable Row','hpull','cable',1),X('Chest Supported Row','hpull','mach',1),
 X('DB Curl','bicep','db'),X('Hammer Curl','bicep','db'),X('EZ Bar Curl','bicep','bb'),X('Cable Curl','bicep','cable'),X('Incline DB Curl','bicep','db'),
 X('DB Shrug','trap','db'),X('Upright Row','trap','bb'),X('Farmer Carry','trap','db',0,{timed:1}),
 X('Plank','core','bw',0,{timed:1}),X('Side Plank','core','bw',0,{timed:1}),X('Hanging Leg Raise','core','bw'),X('Ab Wheel Rollout','core','bw'),X('Cable Crunch','core','cable'),X('Dead Bug','core','bw'),X('Pallof Press','core','cable'),X('Hollow Hold','core','bw',0,{timed:1}),
 X('Burpee','cond','bw',1),X('Mountain Climber','cond','bw',0,{timed:1}),X('Kettlebell Swing','cond','kb',1),X('Goblet Squat','cond','kb',1),X('Push Up','cond','bw',1),X('Jump Squat','cond','bw',1)
];
const EQW={strength:{bb:3,db:1.5,mach:.7,cable:.7,bw:.5,kb:.3},size:{bb:1.5,db:2,mach:2,cable:2,bw:1,kb:.3},define:{bb:1,db:2,mach:1.5,cable:2,bw:1.5,kb:1},stamina:{bb:.3,db:2,mach:.3,cable:1,bw:3,kb:3},general:{bb:1.5,db:1.5,mach:1,cable:1,bw:1.5,kb:1}};
function rng(seed){ let a=seed>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }
function eqOK(e,eq){ return e.q==='bw'||!eq||eq[e.q]!==false; }
function pickEx(tags,used,r,goal,eq,first){
  let c=DB.filter(e=>tags.includes(e.t)&&eqOK(e,eq)&&!used.has(e.n));
  if(!c.length) c=DB.filter(e=>tags.includes(e.t)&&!used.has(e.n));
  if(!c.length) return null;
  if(first&&goal!=='stamina'){ const cc=c.filter(e=>e.c); if(cc.length) c=cc; }
  const w=c.map(e=>(EQW[goal][e.q]||1)*(e.c&&first?1.4:1)); const tot=w.reduce((a,b)=>a+b,0); let x=r()*tot;
  for(let i=0;i<c.length;i++){ x-=w[i]; if(x<=0) return c[i]; } return c[c.length-1];
}
function mkItem(e,idx,goal){
  const G=GOALS[goal]; const main=idx<2&&!e.timed&&e.t!=='core'&&e.t!=='cond';
  let lo,hi,sets,rest;
  if(e.timed){ lo=hi=(goal==='stamina'?30:40); sets=3; rest=goal==='strength'?60:30; }
  else if(e.t==='cond'){ lo=12;hi=20;sets=3;rest=30; }
  else if(main){ [lo,hi]=G.main; sets=G.mSets; rest=G.mRest; }
  else { [lo,hi]=G.acc; sets=G.aSets; rest=G.aRest; }
  if(e.t==='core'&&!e.timed){ lo=10;hi=15;sets=3;rest=Math.min(rest,60); }
  return {name:e.n,key:keyOf(e.n),tag:e.t,eq:e.q,timed:!!e.timed,main,sets,lo,hi,rest,rpe:G.rpe,ss:null};
}
function itemTime(it){ const reps=it.timed?it.hi:(it.lo+it.hi)/2; const work=it.timed?reps+5:reps*3.5+8; const rest=it.ss?it.rest*0.5:it.rest; return it.sets*work+(it.ss?it.sets:Math.max(0,it.sets-1))*rest+25; }
function totalSec(items){ return items.reduce((a,i)=>a+itemTime(i),0); }
function pairUp(items,useSS,time){
  items.forEach(i=>i.ss=null); if(!useSS) return;
  let i=(time<=15||items.length<4)?0:1;
  for(;i+1<items.length;i+=2){ items[i].ss='A'; items[i+1].ss='B'; }
}
const WARM={15:1,30:2,45:3,60:4};
const MAXN={15:4,30:5,45:6,60:6};
function generate(o){
  const goal=GOALS[o.goal]?o.goal:'general'; const focus=PLANS[o.focus]?o.focus:'full'; const time=[15,30,45,60].includes(o.time)?o.time:30;
  const r=rng(o.seed||1); const used=new Set();
  let slots=(goal==='stamina'&&CIRCUIT[focus])?CIRCUIT[focus]:PLANS[focus];
  const n=MAXN[time]; const items=[];
  for(let i=0;i<Math.min(n,slots.length);i++){ const e=pickEx(slots[i],used,r,goal,o.eq,i<2); if(!e) continue; used.add(e.n); items.push(mkItem(e,i,goal)); }
  const useSS=time<=30||goal==='stamina';
  const warm=WARM[time]; const budget=time*60-warm*60;
  pairUp(items,useSS,time);
  let guard=200;
  while(totalSec(items)>budget&&guard-->0){
    let bi=-1,bs=2; for(let i=items.length-1;i>=0;i--){ if(items[i].sets>bs||(items[i].sets===bs&&false)){ bs=items[i].sets; bi=i; } }
    if(bi>=0&&bs>2){ items[bi].sets--; continue; }
    if(items.length>2){ items.pop(); pairUp(items,useSS,time); } else break;
  }
  const min=Math.round((totalSec(items)+warm*60)/60);
  return {goal,focus,time,seed:o.seed||1,items,warm,min,wake:!!o.wake&&focus==='full',ss:useSS};
}
function swapItem(plan,idx,seed,eq){
  const it=plan.items[idx]; const r=rng(seed*7919+idx); const used=new Set(plan.items.map(i=>i.name));
  const tags=[it.tag]; const e=pickEx(tags,used,r,plan.goal,eq,it.main); if(!e) return plan;
  const n=mkItem(e,idx<2?idx:5,plan.goal); n.main=it.main; n.sets=it.sets; n.ss=it.ss; if(!n.main&&!n.timed){ const G=GOALS[plan.goal]; n.lo=G.acc[0]; n.hi=G.acc[1]; n.rest=G.aRest; }
  const items=plan.items.slice(); items[idx]=n; return Object.assign({},plan,{items});
}
const WAKE=['Cat-cow x10','World\'s greatest stretch x5 each side','Bodyweight squat x10','Arm circles x10 each way','Jumping jacks or fast march for 30 sec'];
/* ---- nutrition ---- */
function nutrition(i){
  const w=+i.w,h=+i.h,age=+i.age; const male=i.sex!=='f';
  let ffm=+i.lean>0?+i.lean:(+i.bf>0?w*(1-i.bf/100):null);
  const ms=10*w+6.25*h-5*age+(male?5:-161);
  const bmr=ffm?370+21.6*ffm:ms; const tdee=bmr*(+i.act||1.55);
  const rate=+i.rate||0.5; let target,dir;
  if(i.goal==='cut'){ target=tdee-rate/100*w*7700/7; dir='Deficit'; }
  else if(i.goal==='gain'){ target=tdee*1.07; dir='Surplus'; }
  else { target=tdee*0.9; dir='Mild deficit'; }
  const floor=Math.max(bmr,male?1500:1200); const warn=[]; if(target<floor){ target=floor; warn.push('Target held at a floor of '+Math.round(floor)+' kcal. A faster rate than this is not advised.'); }
  let pLo,pHi,pDef,pBasis;
  if(i.goal==='gain'){ pLo=1.6*w;pHi=2.2*w;pDef=2.0*w;pBasis='2.0 g per kg body weight (range 1.6 to 2.2)'; }
  else if(ffm){ pLo=2.3*ffm;pHi=2.5*ffm;pDef=2.4*ffm;pBasis='2.4 g per kg lean mass (range 2.3 to 2.5)'; }
  else { pLo=2.0*w;pHi=2.4*w;pDef=2.2*w;pBasis='2.2 g per kg body weight (range 2.0 to 2.4)'; }
  const fat=(+i.fat||0.8)*w; let carbs=(target-pDef*4-fat*9)/4;
  if(carbs<0){ carbs=0; warn.push('Protein and fat already use all the calories. Raise calories or lower the rate.'); }
  const meals=Math.max(1,+i.meals||4);
  return {bmr:Math.round(bmr),tdee:Math.round(tdee),kcal:Math.round(target),dir,adj:Math.round(target-tdee),protein:Math.round(pDef),pLo:Math.round(pLo),pHi:Math.round(pHi),pBasis,fat:Math.round(fat),carbs:Math.round(carbs),perMeal:Math.round(pDef/meals),method:ffm?'Katch-McArdle (from lean mass)':'Mifflin-St Jeor',ffm:ffm?Math.round(ffm*10)/10:null,warn};
}
function avgRange(ws,from,to){ const a=ws.filter(x=>x.d>=from&&x.d<=to).map(x=>+x.kg); return a.length?{avg:a.reduce((p,c)=>p+c,0)/a.length,n:a.length}:{avg:0,n:0}; }
function checkin(ws,goal,rate,now){
  const t=ymd(now); const a=avgRange(ws,ymd(addDays(now,-6)),t); const b=avgRange(ws,ymd(addDays(now,-13)),ymd(addDays(now,-7)));
  if(a.n<3||b.n<3) return {ok:false,msg:'Needs at least 3 weigh-ins in each of the last two weeks to compare averages.'};
  const pct=(a.avg-b.avg)/b.avg*100; const r=+rate||0.5; let msg,adj=0;
  if(goal==='cut'){
    if(pct>-r*0.5){ msg='Losing slower than your '+r+'% a week target. If this holds for another week, lower calories by about 100 to 150.'; adj=-125; }
    else if(pct<-r*1.5){ msg='Losing faster than planned. Add about 100 to 200 calories to protect muscle and training quality.'; adj=150; }
    else msg='On track. Keep calories where they are.';
  } else if(goal==='gain'){
    if(pct<0.1){ msg='Gaining slower than about 0.25% a week. Add about 150 to 250 calories.'; adj=200; }
    else if(pct>0.5){ msg='Gaining faster than needed, which mostly adds fat. Trim about 150 calories.'; adj=-150; }
    else msg='On track. Keep calories where they are.';
  } else {
    if(pct>0.15){ msg='Trending up for a recomp. Trim about 100 calories.'; adj=-100; }
    else if(pct<-0.3){ msg='Dropping faster than a recomp needs. Add about 100 calories.'; adj=100; }
    else msg='Weight is steady, which suits a recomp. Keep going and watch strength and the mirror.';
  }
  return {ok:true,pct,a:a.avg,b:b.avg,msg,adj};
}
function recLevel(r){ if(!r||(!r.s&&!r.f&&!r.o&&!r.t)) return null; if((r.s&&r.s<=5)||(r.f&&r.f<=2)||(r.o&&r.o>=4)||(r.t&&r.t<=2)) return 'low'; if(r.s>=8&&r.f>=4&&!(r.o&&r.o>=3)&&!(r.t&&r.t<=3)) return 'good'; return 'ok'; }
function recStats(rec,now,days){ let low=0,seen=0; const sum={s:0,f:0,m:0,o:0,t:0},n={s:0,f:0,m:0,o:0,t:0}; for(let i=0;i<days;i++){ const r=rec[ymd(addDays(now,-i))]; if(!r) continue; if(recLevel(r)||r.m) seen++; if(recLevel(r)==='low') low++; for(const k in sum) if(r[k]){ sum[k]+=r[k]; n[k]++; } } const av=k=>n[k]?sum[k]/n[k]:null; return {low,seen,sleep:av('s'),feel:av('f'),mood:av('m'),sore:av('o'),str:av('t')}; }
function trend(rec,now,target,sessions,goal){
  const lv=[]; for(let i=0;i<14;i++){ const r=rec[ymd(addDays(now,-i))]; lv.push(r?recLevel(r):null); }
  let i=lv[0]===null?1:0; let low=0; while(i<14&&lv[i]==='low'){ low++; i++; }
  i=lv[0]===null?1:0; let good=0; while(i<14&&lv[i]==='good'){ good++; i++; }
  const seen=lv.filter(x=>x).length, lows=lv.filter(x=>x==='low').length;
  const sl=[]; for(let k=0;k<14&&sl.length<5;k++){ const r=rec[ymd(addDays(now,-k))]; if(r&&r.s) sl.push(r.s); }
  const sleep=sl.length>=3?sl.reduce((a,b)=>a+b,0)/sl.length:null;
  const wkAgo=ymd(addDays(now,-6)); const recentSess=(sessions||[]).filter(s=>s.date>=wkAgo).length;
  const out=[];
  if(low>=5||(seen>=8&&lows>=6)) out.push({k:'warn',t:'Flat for a good while now ('+(low>=5?low+' days running':lows+' of the last '+seen+' check-ins')+'). A lighter week is reasonable: about half the usual sets at the same weights, easy cardio, and early nights. If it is more than tiredness, such as low mood that sticks around, it is worth a chat with your GP.'});
  else if(low>=3) out.push({k:'warn',t:'Low for '+low+' days running. Keep the weights where they feel safe, drop a set or two per exercise, and sort sleep before adding anything.'+(recentSess>=target?' You have also trained '+recentSess+' times in the last 7 days, so a rest day is a fair call.':'')});
  else if(low===2) out.push({k:'info',t:'Two low days in a row. Nothing to change yet. If tomorrow is also flat, ease the volume.'});
  if(sleep!==null&&sleep<=5.5) out.push({k:'warn',t:'Sleep has averaged about '+(Math.round(sleep*10)/10)+' hours over your last '+sl.length+' check-ins. Sleep loss tends to hit heavy lifts and recovery first, so it is the cheapest lever to pull.'});
  const ser=k=>{ const a=[]; for(let j=0;j<14;j++){ const r=rec[ymd(addDays(now,-j))]; if(r&&r[k]) a.push(r[k]); } return a; };
  const runOf=(a,fn)=>{ let n=0; while(n<a.length&&fn(a[n])) n++; return n; };
  const mood=ser('m'), sore=ser('o'), str=ser('t');
  const mlow=runOf(mood,v=>v<=2);
  if(mlow>=3) out.push({k:'warn',t:'Mood has been low for '+mlow+' check-ins in a row. Training tends to help mood, so keep sessions short and easy rather than skipping them. If it lasts a couple of weeks or feels heavy, talk to your GP or someone you trust.'});
  const sr=runOf(sore,v=>v>=4);
  if(sr>=3) out.push({k:'warn',t:'Sore at 4 or 5 for '+sr+' check-ins running. That is more than you are recovering from right now. Trim sets on the sore muscles by about a third, or train something else, until it drops to 3 or below.'});
  else if(sore.length>=1&&sore[0]>=4) out.push({k:'info',t:'Very sore today. Warm up longer than usual and let soreness, not the clock, set the pace. Light movement usually eases it.'});
  const sweak=str.slice(0,5).filter(v=>v<=2).length;
  if(str.length>=3&&sweak>=3) out.push({k:'warn',t:'The weights have felt heavy on '+sweak+' of your last '+Math.min(5,str.length)+' check-ins. Common causes are short sleep, too little food'+(goal==='cut'?' (you are in a deficit, so check you are not cutting too hard)':'')+' and stress. Hold the loads rather than pushing for PRs until it lifts.'});
  const sstrong=runOf(str,v=>v>=4);
  if(good>=4&&low===0) out.push({k:'good',t:'Fresh for '+good+' days running. Good window to push top sets or add a rep.'});
  return {out,low,good,seen,lows,sleep};
}
function cardioWeeks(c,now,n){ const mon=mondayOf(now); const out=[]; for(let i=n-1;i>=0;i--){ const s=addDays(mon,-7*i),e=addDays(s,7); const k0=ymd(s),k1=ymd(e); out.push({start:k0,count:Math.round((c||[]).filter(x=>x.date>=k0&&x.date<k1).reduce((a,x)=>a+x.min*(x.effort==='hard'?2:1),0))}); } return out; }
/* ---- warm-up and stretching ---- */
const TAGMAP={}; DB.forEach(e=>{ const k=keyOf(e.n); if(!TAGMAP[k]) TAGMAP[k]=e.t; });
function tagFor(key){
  if(TAGMAP[key]) return TAGMAP[key]; const k=key;
  if(/leg curl|nordic/.test(k)) return 'ham'; if(/curl/.test(k)) return 'bicep'; if(/calf/.test(k)) return 'calf';
  if(/plank|rollout|leg raise|crunch|superman|dead bug|pallof|hollow|carry/.test(k)) return 'core';
  if(/skull|tricep|pushdown|kickback/.test(k)) return 'tri';
  if(/lunge|split squat|step up/.test(k)) return 'lunge';
  if(/deadlift|rdl|good morning|hyperextension|back extension|swing|pull through|\bdl\b/.test(k)) return 'hinge';
  if(/hip thrust|glute bridge/.test(k)) return 'glute';
  if(/squat|leg press|leg extension|sissy/.test(k)) return 'squat';
  if(/pull up|chin up|pulldown|pull down/.test(k)) return 'vpull';
  if(/row|face pull|rear delt|reverse pec/.test(k)) return /upright/.test(k)?'vpush':'hpull';
  if(/bench|incline|push up|\bdip\b|floor press|chest press|hex press|pec|fly\b|flye/.test(k)) return 'hpush';
  if(/overhead|ohp|press|arnie|arnold|lateral raise|upright/.test(k)) return 'vpush';
  return null;
}
const GROUP={squat:'squat',quad:'squat',lunge:'lunge',hinge:'hinge',ham:'hinge',glute:'glute',calf:'calf',hpush:'hpush',incpush:'hpush',fly:'hpush',vpush:'vpush',lat:'vpush',vpull:'vpull',hpull:'hpull',rdelt:'hpull',trap:'hpull',bicep:'arms',tri:'arms',core:'core',cond:'cond'};
const AREAS={squat:'quads, hips, ankles',lunge:'hips, glutes, quads',hinge:'hamstrings, glutes, lower back',glute:'glutes, hips',calf:'calves, ankles',hpush:'chest, shoulders, triceps',vpush:'shoulders, upper back',vpull:'lats, shoulders',hpull:'upper back, rear delts',arms:'elbows, forearms, wrists',core:'trunk',cond:'whole body'};
const WU={
 squat:[['Bodyweight squat, pause at the bottom','10 reps'],['Ankle rocks, knee over toes','10 each side'],['Deep squat hold, elbows pushing knees out','30 sec']],
 lunge:[['Walking lunge with a twist','6 each side'],['Lateral lunge','6 each side'],['Half-kneeling hip flexor rock','8 each side']],
 hinge:[['Bodyweight good morning','10 reps'],['Single leg RDL reach','6 each side'],['Glute bridge, squeeze at the top','12 reps']],
 glute:[['Glute bridge, squeeze at the top','12 reps'],['Lateral band walk, or bodyweight side steps','10 steps each way'],['Donkey kick','10 each side']],
 calf:[['Ankle rocks, knee over toes','10 each side'],['Slow calf raise','15 reps']],
 hpush:[['Arm circles, small to big','10 each way'],['Scapular push-up','10 reps'],['Band pull-apart, or arm swings','15 reps'],['Open book thoracic rotation','6 each side']],
 vpush:[['Arm circles, small to big','10 each way'],['Wall slides','10 reps'],['Band dislocates, or a broomstick pass-through','10 reps'],['Thoracic extension over a bench or roller','8 reps']],
 vpull:[['Dead hang, shoulders active','20 sec'],['Scapular pull-up','8 reps'],['Cross-body arm swings','10 each way'],['Cat-cow','8 reps']],
 hpull:[['Band pull-apart, or reverse arm swings','15 reps'],['Prone Y, T, W raises','6 each'],['Cat-cow','8 reps'],['Open book thoracic rotation','6 each side']],
 arms:[['Wrist circles','10 each way'],['Light band curls and pushdowns','15 each'],['Arm circles, small to big','10 each way']],
 core:[['Dead bug','6 each side'],['Bird dog','6 each side'],['Cat-cow','8 reps']],
 cond:[['Jumping jacks, or fast march','30 sec'],['Inchworm walk-out','5 reps'],['High knees','20 sec']]
};
const STR={squat:['Standing quad stretch','Half-kneeling hip flexor stretch'],lunge:['Half-kneeling hip flexor stretch','Deep squat hold'],hinge:['Hamstring stretch, one heel up on a bench',"Child's pose"],glute:['Figure-four glute stretch'],calf:['Wall calf stretch'],hpush:['Doorway chest stretch','Cross-body shoulder stretch'],vpush:['Cross-body shoulder stretch','Overhead triceps stretch'],vpull:['Lat stretch, hands on a rack or bench'],hpull:["Child's pose with reach",'Cross-body shoulder stretch'],arms:['Wall biceps stretch','Wrist flexor stretch'],core:['Cobra, or upward dog'],cond:[]};
function groupsFor(keys){ const g=[]; keys.forEach(k=>{ const t=tagFor(k); const x=t&&GROUP[t]; if(x&&!g.includes(x)) g.push(x); }); return g; }
function warmupAreas(keys){ const out=[]; groupsFor(keys).forEach(g=>AREAS[g].split(', ').forEach(a=>{ if(!out.includes(a)) out.push(a); })); return out; }
function warmup(keys,len,rot){
  const n={quick:3,std:5,full:7}[len]||5; const raise={quick:'1 min',std:'2 min',full:'3 min'}[len]||'2 min'; const min={quick:4,std:7,full:10}[len]||7;
  let g=groupsFor(keys); if(!g.length) g=['cond','core']; const drills=[]; const seen=new Set();
  for(let p=0;p<4&&drills.length<n;p++) g.forEach(grp=>{ if(drills.length>=n) return; const list=WU[grp]; const d=list[(p+(rot||0))%list.length]; if(!seen.has(d[0])){ seen.add(d[0]); drills.push({n:d[0],dose:d[1]}); } });
  return {raise,drills,min,areas:warmupAreas(keys)};
}
function rampFor(kg){ kg=+kg; if(!(kg>=40)) return null; const out=[]; [[0.5,5],[0.7,3],[0.85,1]].forEach(([p,r])=>{ const k=Math.max(20,roundTo(kg*p,2.5)); if(!out.length||out[out.length-1].kg!==k) out.push({kg:k,reps:r}); }); return out; }
function stretchesFor(keys){ const out=[]; groupsFor(keys).forEach(g=>(STR[g]||[]).forEach(s=>{ if(!out.includes(s)) out.push(s); })); return out.slice(0,6); }
return {parseGrid,trend,tagFor,warmup,warmupAreas,rampFor,stretchesFor,recLevel,recStats,cardioWeeks,keyOf,prettify,parseLoad,parseCell,parseDSL,parseCSV,parseAny,normProgram,exFromPlain,e1rm,roundTo,stepFor,sugLoad,progress,ymd,parseYmd,addDays,mondayOf,weekCounts,streak,plateCount,buildHist,prsFor,sessionVolume,advance,GOALS,FOCUS,PLANS,DB,generate,swapItem,WAKE,nutrition,checkin,totalSec};
})();
/* LOGIC:END */
