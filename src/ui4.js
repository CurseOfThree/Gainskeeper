/* ---------- fuel view ---------- */
function sortedW(){ return [...S.profile.weights].sort((a,b)=>a.d<b.d?-1:1); }
function latestW(){ const w=sortedW(); return w.length?w[w.length-1].kg:null; }
function avgW(){ const w=sortedW(); if(!w.length) return null; const last=w[w.length-1].d; const from=L.ymd(L.addDays(L.parseYmd(last),-6)); const r=w.filter(x=>x.d>=from); return Math.round(r.reduce((a,x)=>a+x.kg,0)/r.length*10)/10; }
function sortedComp(){ return [...(S.profile.comp||[])].sort((a,b)=>a.d<b.d?-1:1); }
function weightNear(d,span){ const w=sortedW(); if(!w.length) return null; const t=L.parseYmd(d).getTime(); let best=null,bd=1e15; w.forEach(x=>{ const dd=Math.abs(L.parseYmd(x.d).getTime()-t); if(dd<bd){bd=dd;best=x;} }); return best&&bd<=(span||14)*864e5?best.kg:null; }
function compSeries(){ return sortedComp().map(c=>{ const w=weightNear(c.d,14); return w?{d:c.d,bf:c.bf,w,lean:Math.round(w*(1-c.bf/100)*10)/10,fat:Math.round(w*c.bf/100*10)/10,m:c.m,id:c.id}:{d:c.d,bf:c.bf,w:null,m:c.m,id:c.id}; }); }
function latestComp(){ const c=sortedComp(); if(!c.length) return null; const x=c[c.length-1]; const age=Math.round((Date.now()-L.parseYmd(x.d).getTime())/864e5); return Object.assign({age},x); }
function fuelCalc(){
  const f=S.profile.fuel; const w=avgW(); const lc=latestComp(); const bf=lc&&lc.age<=120?lc.bf:null; const ex=!(+f.age&&+f.h&&w);
  const r=L.nutrition({sex:f.sex,age:+f.age||30,h:+f.h||178,w:w||80,bf:bf||'',lean:'',act:f.act,goal:f.goal,rate:f.rate,meals:f.meals,fat:f.fat});
  return {r,ex,w:w||80,lc,bf};
}
function fuelOut(){
  const f=S.profile.fuel; const {r,ex,w,lc,bf}=fuelCalc(); const gl={cut:'Lose fat',recomp:'Recomp (build and lose)',gain:'Build muscle'}[f.goal];
  let h='';
  if(ex) h+='<div class="notice" style="margin-bottom:10px">These are example numbers for a 30 year old, 178 cm, 80 kg man. Log a weigh-in below and fill in your age and height under Targets to get yours.</div>';
  h+='<div class="card"><div class="row between"><h3>Daily target</h3><span class="tag">'+esc(gl)+'</span></div><div style="margin:8px 0"><span class="big num">'+r.kcal.toLocaleString('en-AU')+'</span> <span class="muted">kcal</span></div><p class="small muted">'+r.dir+' of '+Math.abs(r.adj)+' kcal against maintenance ('+r.tdee.toLocaleString('en-AU')+').</p>';
  h+='<div class="macro" style="margin-top:12px"><div><b class="num">'+r.protein+' g</b><span class="small muted">Protein (range '+r.pLo+' to '+r.pHi+')</span></div><div><b class="num">'+r.carbs+' g</b><span class="small muted">Carbs</span></div><div><b class="num">'+r.fat+' g</b><span class="small muted">Fat</span></div><div><b class="num">'+r.perMeal+' g</b><span class="small muted">Protein per meal, '+(+f.meals||4)+' meals</span></div></div>';
  if(r.warn.length) h+='<div class="notice" style="margin-top:10px">'+r.warn.map(esc).join('<br>')+'</div>';
  h+='<p class="small muted" style="margin-top:10px">Based on '+(ex?'example numbers':fk(w)+' kg (7 day average)')+(bf?' and '+bf+'% body fat ('+(lc.age===0?'today':lc.age===1?'yesterday':lc.age+' days ago')+')':', with no recent body fat reading')+'. It updates as you log.</p>';
  h+='<p class="tiny muted" style="margin-top:10px">Base rate by '+esc(r.method)+': '+r.bmr+' kcal. Protein basis: '+esc(r.pBasis)+(r.ffm?'. Lean mass used: '+r.ffm+' kg':'')+'.</p></div>';
  return h;
}
function checkinView(){
  const f=S.profile.fuel; const ws=S.profile.weights; const c=L.checkin(ws,f.goal,f.rate,new Date());
  let h='<div class="card"><h3>Weekly check-in</h3>';
  if(!c.ok) return h+'<p class="small muted" style="margin-top:6px">'+c.msg+'</p></div>';
  h+='<p class="small" style="margin:6px 0">7 day average <b class="num">'+c.a.toFixed(1)+' kg</b> against <b class="num">'+c.b.toFixed(1)+' kg</b> the week before ('+(c.pct>=0?'+':'')+c.pct.toFixed(2)+'% a week).</p><p>'+esc(c.msg)+'</p></div>'; return h;
}
const MFIELDS2=[['neck','Neck'],['chest','Chest'],['waist','Waist'],['hips','Hips'],['arm','Arm'],['thigh','Thigh']];
const BFM={scale:'Smart scale',dexa:'DEXA',calipers:'Calipers',tape:'Tape estimate',other:'Other'};
function chg(a,b,unit,dp){ if(a==null||b==null) return ''; const d=Math.round((a-b)*(dp||10))/(dp||10); return ' <span class="tiny '+(d===0?'muted':'')+'">('+(d>0?'+':'')+d+(unit||'')+')</span>'; }
function tapeEstimate(){ const f=S.profile.fuel; const ms=[...(S.profile.meas||[])].filter(x=>x.neck>0&&x.waist>0&&(f.sex!=='f'||x.hips>0)).sort((a,b)=>a.d<b.d?-1:1); if(!ms.length) return null; const m=ms[ms.length-1]; const v=L.navyBF(f.sex,f.h,m.neck,m.waist,m.hips); return v?{bf:v,d:m.d}:null; }
function bodyCard(){
  const w=sortedW(); const cs=compSeries(); const lc=latestComp(); const aw=avgW();
  const ago=L.ymd(L.addDays(new Date(),-28)); const wOld=(()=>{ const r=w.filter(x=>x.d<=ago); return r.length?r[r.length-1].kg:null; })();
  const cLast=cs.filter(x=>x.w).slice(-1)[0]; const cOld=(()=>{ const r=cs.filter(x=>x.w&&x.d<=ago); return r.length?r[r.length-1]:null; })();
  let h='<div class="card"><h3>Body composition</h3><p class="small muted" style="margin:4px 0 8px">Weigh most mornings. Add a body fat reading whenever you get one (scale, DEXA, calipers or the tape estimate). Changes are against 4 weeks ago.</p>';
  h+='<div class="kv"><div><b class="num">'+(aw?fk(aw):'-')+'</b><span>kg, 7 day avg'+(aw&&wOld?chg(aw,wOld,''):'')+'</span></div><div><b class="num">'+(lc?lc.bf:'-')+'</b><span>body fat %'+(cLast&&cOld?chg(cLast.bf,cOld.bf,''):'')+'</span></div><div><b class="num">'+(cLast?fk(cLast.lean):'-')+'</b><span>lean kg'+(cLast&&cOld?chg(cLast.lean,cOld.lean,''):'')+'</span></div><div><b class="num">'+(cLast?fk(cLast.fat):'-')+'</b><span>fat kg'+(cLast&&cOld?chg(cLast.fat,cOld.fat,''):'')+'</span></div></div>';
  const which=S.ui.bodyChart||'w'; const cut=L.ymd(L.addDays(new Date(),-365));
  const series={w:w.filter(x=>x.d>=cut).map(x=>({x:L.parseYmd(x.d).getTime(),y:x.kg})),bf:cs.filter(x=>x.d>=cut).map(x=>({x:L.parseYmd(x.d).getTime(),y:x.bf})),lean:cs.filter(x=>x.w&&x.d>=cut).map(x=>({x:L.parseYmd(x.d).getTime(),y:x.lean})),fat:cs.filter(x=>x.w&&x.d>=cut).map(x=>({x:L.parseYmd(x.d).getTime(),y:x.fat}))};
  const lbl={w:'Weight (kg)',bf:'Body fat %',lean:'Lean mass (kg)',fat:'Fat mass (kg)'};
  h+='<div class="chips" style="margin-top:12px">'+Object.keys(lbl).map(k=>'<button class="chip" data-act="bodychart" data-v="'+k+'" aria-pressed="'+(which===k)+'">'+lbl[k].replace(/ \(kg\)/,'')+'</button>').join('')+'</div>';
  h+=series[which].length>=2?chart(series[which],{label:lbl[which]+' over the last year'}):'<p class="small muted" style="margin:10px 0">'+(which==='w'?'Two weigh-ins and a line appears here.':'Add two body fat readings (with a weigh-in near each) to see this line.')+'</p>';
  const te=tapeEstimate();
  h+='<div class="grid2" style="margin-top:12px"><div><label class="lbl" for="bw">Weight today (kg)</label><input id="bw" type="number" inputmode="decimal" step="0.1" placeholder="'+(w.length?fk(w[w.length-1].kg):'kg')+'"></div><div><label class="lbl" for="bbf">Body fat % (optional)</label><input id="bbf" type="number" inputmode="decimal" step="0.1" placeholder="%"></div></div>';
  h+='<div class="grid2" style="margin-top:8px"><div><label class="lbl" for="bm">Body fat from</label><select id="bm">'+Object.keys(BFM).map(k=>'<option value="'+k+'">'+BFM[k]+'</option>').join('')+'</select></div><div><label class="lbl" for="bd">Date</label><input id="bd" type="date" max="'+today()+'" value="'+today()+'"></div></div>';
  h+='<button class="btn pri" style="width:100%;margin-top:10px" data-act="bodysave">Save</button>';
  if(te) h+='<p class="small" style="margin:10px 0 0">Tape estimate from your '+fdate(te.d)+' measurements: <b class="num">'+te.bf+'%</b> <button class="btn sm ghost" data-act="tapeuse" data-v="'+te.bf+'" data-d="'+te.d+'">Use it</button></p>';
  else h+='<p class="tiny muted" style="margin:10px 0 0">Log neck and waist'+(S.profile.fuel.sex==='f'?' and hips':'')+' in Measurements, with your height under Targets, and the app can estimate body fat from them (US Navy tape method, roughly ±3 to 4%).</p>';
  const rows=[]; w.forEach(x=>rows.push({d:x.d,t:'w',v:fk(x.kg)+' kg'})); cs.forEach(x=>rows.push({d:x.d,t:'c',id:x.id,v:x.bf+'% '+(BFM[x.m]||'').toLowerCase()}));
  rows.sort((a,b)=>a.d<b.d?1:-1);
  if(rows.length) h+='<details style="margin-top:10px"><summary class="small">Recent entries</summary>'+rows.slice(0,14).map(r=>'<div class="li"><span>'+fdate(r.d)+'</span><span class="num">'+esc(r.v)+' <button class="btn sm ghost" data-act="'+(r.t==='w'?'fwdel':'compdel')+'" '+(r.t==='w'?'data-d="'+r.d+'"':'data-id="'+esc(r.id)+'"')+' aria-label="Delete entry from '+r.d+'">Delete</button></span></div>').join('')+'</details>';
  return h+'</div>';
}
function measCard2(){
  const ms=[...(S.profile.meas||[])].sort((a,b)=>a.d<b.d?-1:1); const m=S.ui.ms;
  let h='<div class="card"><h3>Measurements</h3><p class="small muted" style="margin:4px 0 8px">Every few weeks, same spot, same time of day. Neck and waist'+(S.profile.fuel.sex==='f'?' plus hips':'')+' also give a body fat estimate.</p>';
  if(ms.length){ h+='<div class="kv">'+MFIELDS2.map(f=>{ const v=ms.filter(x=>x[f[0]]>0); if(!v.length) return ''; const last=v[v.length-1][f[0]],first=v[0][f[0]]; return '<div><b class="num">'+last+'</b><span>'+f[1]+' cm'+(v.length>1?chg(last,first,''):'')+'</span></div>'; }).join('')+'</div>';
    const fld=S.ui.mChart||'waist'; const pts=ms.filter(x=>x[fld]>0).map(x=>({x:L.parseYmd(x.d).getTime(),y:x[fld]}));
    h+='<div class="chips" style="margin-top:10px">'+MFIELDS2.filter(f=>ms.some(x=>x[f[0]]>0)).map(f=>'<button class="chip" data-act="mchart" data-v="'+f[0]+'" aria-pressed="'+(fld===f[0])+'">'+f[1]+'</button>').join('')+'</div>'+(pts.length>=2?chart(pts,{label:fld+' (cm) over time'}):''); }
  h+='<details style="margin-top:10px"'+(ms.length?'':' open')+'><summary class="small">Add measurements</summary><div class="grid2" style="margin-top:8px">'+MFIELDS2.map(f=>'<div><label class="lbl" for="m'+f[0]+'">'+f[1]+' (cm)</label><input id="m'+f[0]+'" type="number" inputmode="decimal" data-in="ms" data-k="'+f[0]+'" value="'+esc(m[f[0]]||'')+'"></div>').join('')+'<div><label class="lbl" for="mdate">Date</label><input id="mdate" type="date" data-in="ms" data-k="d" max="'+today()+'" value="'+esc(m.d||today())+'"></div></div><button class="btn pri" style="width:100%;margin-top:10px" data-act="msadd">Save measurements</button>';
  h+=[...ms].reverse().slice(0,6).map(x=>'<div class="li"><div class="grow"><b>'+fdate(x.d)+'</b><div class="hint num">'+MFIELDS2.filter(f=>x[f[0]]>0).map(f=>f[1]+' '+x[f[0]]).join(' · ')+'</div></div><button class="btn sm ghost" data-act="msdel" data-id="'+esc(x.id)+'">Delete</button></div>').join('')+'</details>';
  return h+'</div>';
}
function foodView(){
  const p=S.profile; let h='<div class="card"><div class="row between"><h3>Food log</h3><button class="chip" data-act="foodtoggle" aria-pressed="'+p.foodOn+'">'+(p.foodOn?'On':'Off')+'</button></div>';
  if(!p.foodOn) return h+'<p class="small muted" style="margin-top:6px">Optional and off by default. Turn it on to log what you eat and compare it with your targets.</p></div>';
  const day=S.ui.fuelDay; const list=p.food[day]||[]; const tot=list.reduce((a,x)=>({k:a.k+x.kcal,p:a.p+x.p,c:a.c+x.c,f:a.f+x.f}),{k:0,p:0,c:0,f:0}); const r=fuelCalc().r;
  h+='<div class="row between" style="margin:8px 0"><button class="btn sm" data-act="foodday" data-v="-1" aria-label="Previous day">‹</button><b>'+fdate(day)+'</b><button class="btn sm" data-act="foodday" data-v="1" aria-label="Next day">›</button></div>';
  const row=(n,v,t,u)=>'<div style="margin:6px 0"><div class="row between small"><span>'+n+'</span><span class="num">'+Math.round(v)+' / '+t+u+'</span></div><div class="bar"><i style="width:'+Math.min(100,v/Math.max(1,t)*100)+'%"></i></div></div>';
  h+=row('Calories',tot.k,r.kcal,' kcal')+row('Protein',tot.p,r.protein,' g')+row('Carbs',tot.c,r.carbs,' g')+row('Fat',tot.f,r.fat,' g');
  h+=list.map(x=>'<div class="li"><div class="grow">'+esc(x.n)+'<div class="hint num">'+x.kcal+' kcal · P'+x.p+' C'+x.c+' F'+x.f+'</div></div><button class="btn sm ghost" data-act="fooddel" data-id="'+x.id+'">Delete</button></div>').join('');
  const seen=new Map(); Object.keys(p.food).sort().reverse().slice(0,14).forEach(d=>p.food[d].forEach(x=>{ if(!seen.has(x.n)) seen.set(x.n,x); }));
  if(seen.size) h+='<span class="lbl" style="margin-top:12px">Quick add</span><div class="chips">'+[...seen.values()].slice(0,8).map(x=>'<button class="chip" data-act="foodquick" data-n="'+esc(x.n)+'">'+esc(x.n)+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:12px">Add food</span><input id="fn" placeholder="Name" aria-label="Food name"><div class="grid2" style="margin-top:8px"><input id="fk" inputmode="decimal" placeholder="kcal" aria-label="Calories"><input id="fp" inputmode="decimal" placeholder="Protein g" aria-label="Protein grams"><input id="fc" inputmode="decimal" placeholder="Carbs g" aria-label="Carb grams"><input id="ff" inputmode="decimal" placeholder="Fat g" aria-label="Fat grams"></div><button class="btn pri" style="margin-top:8px;width:100%" data-act="foodadd">Add</button></div>';
  return h;
}
function viewFuel(){
  const f=S.profile.fuel;
  const sel=(k,opts)=>'<select data-in="fuel" data-k="'+k+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(String(f[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  let h='<div id="fuelout">'+fuelOut()+'</div>'+bodyCard()+checkinView()+measCard2();
  const setUp=+f.age&&+f.h;
  h+='<div class="card"><details'+(setUp?'':' open')+'><summary><b>Targets and you</b><span class="small muted" style="margin-left:8px">'+esc({cut:'Lose fat',recomp:'Recomp',gain:'Build muscle'}[f.goal]||'')+(setUp?' · '+f.age+' y · '+f.h+' cm':'')+'</span></summary><div class="stack" style="margin-top:10px">';
  h+='<div><span class="lbl">Goal</span><div class="chips">'+[['cut','Lose fat'],['recomp','Recomp'],['gain','Build muscle']].map(x=>'<button class="chip" data-act="fgoal" data-v="'+x[0]+'" aria-pressed="'+(f.goal===x[0])+'">'+x[1]+'</button>').join('')+'</div></div>';
  h+='<div><span class="lbl">Sex (for the formulas and percentiles)</span><div class="chips"><button class="chip" data-act="fsex" data-v="m" aria-pressed="'+(f.sex!=='f')+'">Male</button><button class="chip" data-act="fsex" data-v="f" aria-pressed="'+(f.sex==='f')+'">Female</button></div></div>';
  h+='<div class="grid2"><div><label class="lbl" for="fa">Age</label><input id="fa" type="number" inputmode="numeric" data-in="fuel" data-k="age" value="'+esc(f.age)+'" placeholder="years"></div><div><label class="lbl" for="fh">Height (cm)</label><input id="fh" type="number" inputmode="decimal" data-in="fuel" data-k="h" value="'+esc(f.h)+'"></div></div>';
  h+='<div><label class="lbl" for="fx">Activity</label>'+sel('act',[[1.4,'Mostly seated, lifting 3 to 4 times a week'],[1.55,'Moderately active day, lifting 4 times a week'],[1.7,'On your feet most of the day, plus lifting']]).replace('<select','<select id="fx"')+'</div>';
  h+='<div class="grid2"><div><label class="lbl" for="fr">Fat loss rate (per week)</label>'+sel('rate',[[0.25,'0.25% of body weight'],[0.5,'0.5% (default)'],[0.75,'0.75%']]).replace('<select','<select id="fr"')+'</div><div><label class="lbl" for="fm">Meals a day</label>'+sel('meals',[[3,'3'],[4,'4'],[5,'5'],[6,'6']]).replace('<select','<select id="fm"')+'</div></div>';
  h+='<div><label class="lbl" for="ft">Fat (grams per kg body weight)</label>'+sel('fat',[[0.6,'0.6 (lower fat, more carbs)'],[0.8,'0.8 (default)'],[1,'1.0 (higher fat)']]).replace('<select','<select id="ft"')+'</div></div>';
  h+='<p class="tiny muted" style="margin-top:8px">The rate only applies when losing fat.</p></details></div>'+foodView();
  h+='<div class="card"><details><summary>How this is worked out</summary><div class="small stack" style="margin-top:8px">'+
  '<p><b>Base rate.</b> Uses your 7 day average weight. If you have a body fat reading from the last 4 months, the Katch-McArdle formula (370 + 21.6 × lean kg) uses your lean mass; otherwise Mifflin-St Jeor uses age, height, weight and sex. So as your weight and body fat change, the target follows. Either is multiplied by your activity level to estimate maintenance. Formulas are estimates, so the weekly check-in matters more than the first number.</p>'+
  '<p><b>Calories.</b> Fat loss: maintenance minus (rate × body weight × 7700 kcal ÷ 7 days). Recomp: 10% under maintenance. Build muscle: 7% over. There is a floor at your base rate or 1500 kcal (1200 for women), whichever is higher.</p>'+
  '<p><b>Protein.</b> Building: 2.0 g per kg body weight (range 1.6 to 2.2), from the Morton 2018 meta-analysis. Cutting or recomp: 2.4 g per kg of lean mass (range 2.3 to 2.5) if lean mass is known, otherwise 2.2 g per kg body weight (2.0 to 2.4). Higher protein in a deficit is supported by Longland 2016, Mettler 2010 and Helms 2014.</p>'+
  '<p><b>Fat and carbs.</b> Fat is set at 0.8 g per kg by default. Carbs are what is left. Carbs fuel training, so they take the remaining calories.</p>'+
  '<p><b>Tape estimate.</b> The US Navy formula from height, neck and waist (and hips for women). It is typically within 3 to 4 percentage points of a DEXA scan, so treat it as a trend, not a measurement.</p>'+
  '<p><b>Check-in.</b> Compares your 7 day average weight with the week before. A cut aims for your chosen rate, building aims for about 0.25% a week, and recomp aims to stay flat.</p>'+
  '<p class="muted"><b>My choices, not research:</b> the 7% surplus, the 10% recomp deficit, the 0.8 g per kg fat default, the calorie floors and the 7700 kcal per kg rule of thumb. Treat them as sensible starting points.</p>'+
  '<p class="muted">This is general guidance, not advice from a dietitian or doctor. If you have a medical condition or a history of disordered eating, check with a professional first.</p></div></details></div>';
  return h;
}
/* ---------- library ---------- */
function allLib(){ return LIB.concat((S.profile.customLib||[]).map(c=>({id:c.id,topic:'mine',title:c.title,by:'',venue:'',year:null,type:null,str:0,seen:'',use:c.note||'',caveat:'',url:c.url,custom:true}))); }
function viewLibrary(){
  const f=S.ui.lib; const topics=TOPICS.concat([['mine','Mine']]);
  let h='<div class="card"><h2>Library</h2><p class="small muted" style="margin:6px 0">Everything the app is built on, so you can read the studies yourself. The summaries are mine, written from abstracts, summary pages or what I already knew. The line marked "I saw" says which. Full texts were often blocked, titles are shortened, and the link has the exact one.</p><p class="small muted"><b>Evidence dots</b> are my rough read from study type: three dots for position stands and meta-analyses, two for trials and reviews, one for small studies, preprints or things I did not read. It is not a formal grade.</p></div>';
  h+='<div class="sub"><button class="chip" data-act="libfilter" data-v="all" aria-pressed="'+(f==='all')+'">All</button>'+topics.map(t=>'<button class="chip" data-act="libfilter" data-v="'+t[0]+'" aria-pressed="'+(f===t[0])+'">'+t[1]+'</button>').join('')+'</div>';
  const items=allLib().filter(e=>f==='all'||e.topic===f);
  items.forEach(e=>{
    const rd=!!S.profile.libRead[e.id]; const link=e.url||(e.q?'https://pubmed.ncbi.nlm.nih.gov/?term='+encodeURIComponent(e.q):'');
    h+='<div class="card lib" id="lib-'+esc(e.id)+'"><div class="row between">'+(e.type?'<span class="tag">'+esc(T[e.type])+'</span>':'<span class="tag g">Added by you</span>')+(e.str?'<span class="dots" role="img" aria-label="Evidence strength '+e.str+' of 3">'+[1,2,3].map(n=>'<i class="'+(n<=e.str?'on':'')+'"></i>').join('')+'</span>':'')+'</div>';
    h+='<h3 style="margin-top:8px">'+esc(e.title)+'</h3><p class="small muted">'+[e.by,e.venue,e.year].filter(Boolean).map(esc).join(' · ')+'</p>';
    if(e.use) h+='<p class="small" style="margin-top:8px">'+(e.custom?'':'<b>Used here:</b> ')+esc(e.use)+'</p>';
    if(e.caveat) h+='<p class="small muted" style="margin-top:6px"><b>Caveat:</b> '+esc(e.caveat)+'</p>';
    if(e.seen) h+='<p class="tiny muted" style="margin-top:6px">I saw: '+esc(e.seen)+'</p>';
    h+='<div class="row between" style="margin-top:10px">'+(link?'<a href="'+esc(link)+'" target="_blank" rel="noopener">'+(e.url?'Open source':'Find on PubMed')+'</a>':'<span></span>')+'<label class="row small" style="gap:6px"><input type="checkbox" style="width:22px;min-height:22px" data-in="libread" data-id="'+esc(e.id)+'"'+(rd?' checked':'')+'> Read it</label></div>';
    h+='<textarea style="min-height:60px;margin-top:8px" data-in="libnote" data-id="'+esc(e.id)+'" placeholder="Your notes" aria-label="Notes on '+esc(e.title)+'">'+esc(S.profile.libNotes[e.id]||'')+'</textarea>';
    if(e.custom) h+='<div style="margin-top:8px">'+ask('lb'+e.id,'Remove','libdel',e.id)+'</div>';
    h+='</div>';
  });
  if(!items.length) h+='<div class="card"><p class="muted">Nothing here yet.</p></div>';
  h+='<div class="card"><div class="row between"><h3>Add your own</h3><button class="btn sm" data-act="libaddtoggle">'+(S.ui.libAdd?'Close':'Add')+'</button></div>'+(S.ui.libAdd?'<div class="stack" style="margin-top:10px"><input id="lt" placeholder="Title" aria-label="Title"><input id="lu" type="url" placeholder="Link (optional)" aria-label="Link"><textarea id="ln" placeholder="Why it matters to you" aria-label="Note"></textarea><button class="btn pri" data-act="libaddsave">Save</button></div>':'')+'</div>';
  h+='<div class="card"><details><summary>Where I used my own judgement</summary><div class="small stack" style="margin-top:8px"><p>Rest times in the random sessions, the time model (how long a set takes), the way sessions are trimmed to fit your minutes, the exercise list and which exercises go with each focus, the choice of 3 to 4 sets, and the formula that turns your logged lifts into a suggested weight. I could not find solid sources for rest times in the time I had, so treat those as defaults. The warm-up drills, how many are shown for each length, the ramp percentages (50, 70 and 85%) and the 30 second stretch holds are my own picks. The research only backs the general shape: warm up with dynamic moves, skip long static holds beforehand, and stretch afterwards if you like.</p><p>The research was used for the shape of things: volume per muscle, full body versus split, load ranges, protein, deficit size and the case for light gamification.</p></div></details></div>';
  return h;
}
