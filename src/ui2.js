/* ---------- workout building ---------- */
let EXNAMES={mine:new Set(),all:[],txt:{}};
const TAGWORDS={bicep:'biceps arms curl',tri:'triceps arms',hpush:'chest push pecs',vpush:'shoulders delts press overhead',hpull:'back row upper back',vpull:'back lats pull',ham:'hamstrings legs',glute:'glutes legs hips',calf:'calves legs',core:'core abs',lunge:'legs quads single leg',squat:'legs quads',hinge:'posterior chain hamstrings back',cond:'conditioning cardio'};
function exSugHTML(q){
  q=String(q||'').trim().toLowerCase(); if(q.length<1) return '';
  const words=q.split(/\s+/); const hits=EXNAMES.all.filter(n=>{ const l=n.toLowerCase(); const tw=(EXNAMES.txt[n]||l).split(/[\s()]+/); return words.every(w=>l.includes(w)||tw.some(x=>x.startsWith(w))); });
  const score=n=>{ const l=n.toLowerCase(); return (EXNAMES.mine.has(L.keyOf(n))?0:10)+(l.startsWith(q)?0:l.split(/\s+/).some(w=>w.startsWith(words[0]))?2:5)+l.length/100; };
  hits.sort((a,b)=>score(a)-score(b));
  const exact=hits.some(n=>n.toLowerCase()===q);
  let h=hits.slice(0,7).map(n=>'<button type="button" class="exopt" role="option" data-act="exsug" data-v="'+esc(n)+'">'+esc(n)+(EXNAMES.mine.has(L.keyOf(n))?' <span class="tiny muted">done before</span>':'')+'</button>').join('');
  if(!exact) h+='<button type="button" class="exopt new" data-act="addex">Add "'+esc(String(S.ui.addEx).trim())+'" as a new exercise</button>';
  return h;
}
function stepGuess(key){ return /(^| )(db|kb|dumbbell|kettlebell|curl|raise|flye|fly|lunge|step up|press down|pushdown)/.test(key)?1:2.5; }
function suggestFor(it,hist){
  if(it.timed) return null; const h=hist[it.key]; if(!h||!h.length) return null;
  const step=L.stepFor(it.eq||'bb'); const last=h[0];
  const inRange=last.sets.every(s=>s.reps>=it.lo-2&&s.reps<=it.hi+2);
  if(inRange&&S.profile.prog){ const p=L.progress(last.sets,it.lo,it.hi,step); if(p) return {kg:p.kg,reps:p.reps,note:p.note}; }
  const e=Math.max(...h.slice(0,3).map(x=>x.e1)); const kg=L.sugLoad(e,it.hi,it.rpe||8,step); if(!kg) return null;
  return {kg,reps:it.hi,note:'From your best recent estimate ('+Math.round(e)+' kg for one rep), leaving about '+Math.round(10-(it.rpe||8))+' reps in reserve.'};
}
function rpeSug(pe,hist){
  if(pe.rpe==null||pe.timed||!(pe.reps>0)) return null; const h=hist[pe.key]; if(!h||!h.length) return null;
  const recent=h.slice(0,4).filter(x=>x.e1>0); if(!recent.length) return null; const e=Math.max(...recent.map(x=>x.e1));
  const step=stepGuess(pe.key); const kg=L.sugLoad(e,pe.reps,pe.rpe,step); if(!kg) return null;
  return {kg,reps:pe.reps,note:'RPE '+pe.rpe+' for '+pe.reps+' is about '+Math.round(L.rpePct(pe.reps,pe.rpe))+'% of your estimated max ('+Math.round(e)+' kg, from your last '+recent.length+' session'+(recent.length>1?'s':'')+'). A starting point from the RPE chart: adjust on the first set.'};
}
function fromProgramEx(pe,hist){
  const h=(hist[pe.key]||[])[0]; let kg=pe.kg; if(h&&(kg==null||h.topKg>kg)) kg=h.topKg;
  const sets=[]; for(let i=0;i<pe.sets;i++){ const tr=pe.repsList?pe.repsList[i]:pe.reps; sets.push({kg:kg==null?'':kg,reps:'',done:false,tr:tr==null?'':tr}); }
  const heavy=(pe.reps||10)<=6;
  return {id:uid(),name:pe.name,key:pe.key,ss:pe.ss,note:pe.note||'',target:{sets:pe.sets,repsText:pe.repsText,lo:pe.reps,hi:pe.reps,rpe:pe.rpe,raw:pe.raw,per:pe.per,timed:pe.timed,rest:heavy?150:90},sets,sug:rpeSug(pe,hist)};
}
function fromPlanItem(it,hist){
  const sug=suggestFor(it,hist); const sets=[]; for(let i=0;i<it.sets;i++) sets.push({kg:sug?sug.kg:'',reps:'',done:false,tr:it.hi});
  const g=(it.main?'':'')+(it.lo===it.hi?it.lo:it.lo+' to '+it.hi);
  return {id:uid(),name:it.name,key:it.key,ss:it.ss,note:'',target:{sets:it.sets,repsText:it.timed?it.hi+' sec':String(g),lo:it.lo,hi:it.hi,rpe:it.rpe,raw:'',per:'',timed:it.timed,rest:it.rest},sets,sug};
}
function saveActive(){ if(S.active) lsSet(LS_ACTIVE,S.active); }
let actT=null; function saveActiveSoon(){ clearTimeout(actT); actT=setTimeout(saveActive,300); }
const wdate=()=>S.ui.logDate||today();
function startWorkout(a){ toast(''); a.past=a.date!==today(); S.ui.logDate=''; S.active=a; S.ui.inWorkout=true; S.ui.summary=null; saveActive(); S.rest=null; try{ if(navigator.wakeLock) navigator.wakeLock.request('screen').catch(()=>{}); }catch(e){} window.scrollTo(0,0); render(); }
function startProgram(w,d){
  const prog=activeProg(); if(!prog||!prog.weeks[w]||!prog.weeks[w].days[d]) return; const day=prog.weeks[w].days[d]; const hist=L.buildHist(S.sessions);
  startWorkout({id:uid(),start:Date.now(),date:wdate(),type:'program',title:day.name+' (week '+(w+1)+')',pid:prog.id,w,d,notes:'',ex:day.ex.map(e=>fromProgramEx(e,hist))});
}
function startRandom(){
  const rz=S.ui.rz; if(!rz.plan) return; const hist=L.buildHist(S.sessions); const p=rz.plan;
  startWorkout({id:uid(),date:wdate(),start:Date.now(),type:'random',title:L.GOALS[p.goal].label+' '+L.FOCUS.find(f=>f[0]===p.focus)[1].toLowerCase()+' ('+p.time+' min)',goal:p.goal,focus:p.focus,wake:p.wake,notes:'',ex:p.items.map(i=>fromPlanItem(i,hist))});
}
function startFree(){ startWorkout({id:uid(),date:wdate(),start:Date.now(),type:'free',title:'Free session',notes:'',ex:[]}); }
/* ---------- randomiser ---------- */
const AREA={legs:['squat','hinge','lunge','quad','ham','calf'],glutes:['glute'],back:['vpull','hpull','rdelt','trap'],chest:['hpush','incpush','fly'],shoulders:['vpush','lat','rdelt'],arms:['bicep','tri'],core:['core']};
function leastTrained(){
  const cut=L.ymd(L.addDays(new Date(),-7)); const tagOf={}; L.DB.forEach(e=>{ tagOf[L.keyOf(e.n)]=e.t; });
  const cnt={}; Object.keys(AREA).forEach(k=>cnt[k]=0);
  S.sessions.filter(s=>s.date>=cut).forEach(s=>(s.ex||[]).forEach(e=>{ const t=tagOf[e.key]; if(!t) return; Object.keys(AREA).forEach(a=>{ if(AREA[a].includes(t)) cnt[a]+=(e.sets||[]).length; }); }));
  const min=Math.min(...Object.values(cnt)); const c=Object.keys(cnt).filter(k=>cnt[k]===min); return c[Math.floor(Math.random()*c.length)];
}
function rzGen(keepSeed){ const rz=S.ui.rz; if(!keepSeed) rz.seed=Math.floor(Math.random()*1e9)+1; rz.plan=L.generate({goal:rz.goal,focus:rz.focus,time:rz.time,seed:rz.seed,eq:S.profile.eq,wake:rz.wake}); }
function planItemView(it,i,hist){
  const sug=suggestFor(it,hist); const reps=it.timed?it.hi+' sec':(it.lo===it.hi?it.lo:it.lo+' to '+it.hi);
  const last=(hist[it.key]||[])[0];
  return '<div class="li"><div class="grow">'+(it.ss?'<span class="ss">'+it.ss+'</span>':'')+'<span class="exn">'+esc(it.name)+'</span><div class="hint num">'+it.sets+' × '+reps+' · rest '+it.rest+'s'+(it.ss==='A'?' after the pair':'')+'</div>'+
    (sug?'<div class="hint b num">Try '+fk(sug.kg)+' kg × '+sug.reps+'</div>':(it.timed?'':'<div class="hint">'+(last?'Last: '+fk(last.sets[0].kg)+' kg':'No history yet. Pick a weight that leaves about '+Math.round(10-it.rpe)+' reps spare.')+'</div>'))+'</div><button class="btn sm ghost" data-act="rzswap" data-i="'+i+'" aria-label="Swap '+esc(it.name)+'">Swap</button></div>';
}
function randomiserView(){
  const rz=S.ui.rz; const hist=L.buildHist(S.sessions); const G=L.GOALS;
  let h='<div class="card"><h2>Off the book</h2><p class="small muted" style="margin:4px 0 12px">Pick a goal, a focus and the time you have. Nothing here changes your program.</p>';
  h+='<span class="lbl">Goal</span><div class="chips" role="group" aria-label="Goal">'+Object.keys(G).map(k=>'<button class="chip" data-act="rzset" data-k="goal" data-v="'+k+'" aria-pressed="'+(rz.goal===k)+'">'+G[k].label+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:12px">Focus</span><div class="chips" role="group" aria-label="Focus">'+L.FOCUS.map(f=>'<button class="chip" data-act="rzset" data-k="focus" data-v="'+f[0]+'" aria-pressed="'+(rz.focus===f[0])+'">'+f[1]+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:12px">Time</span><div class="chips" role="group" aria-label="Time">'+[15,30,45,60].map(t=>'<button class="chip" data-act="rzset" data-k="time" data-v="'+t+'" aria-pressed="'+(rz.time===t)+'">'+t+' min</button>').join('')+'</div>';
  if(rz.focus==='full') h+='<div class="row" style="margin-top:12px"><button class="chip" data-act="rzwake" aria-pressed="'+rz.wake+'">Add a 3 minute wake-up flow</button></div>';
  h+='<div class="row" style="margin-top:14px"><button class="btn pri grow" data-act="rzgen">'+(rz.plan?'Rebuild':'Build session')+'</button><button class="btn" data-act="rzsurprise">Surprise me</button></div>';
  h+='<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="rzpreset" data-p="wake">15 min wake-up</button><button class="btn sm ghost" data-act="rzpreset" data-p="full30">30 min full body</button></div></div>';
  if(rz.plan){ const p=rz.plan;
    h+='<div class="card"><div class="row between"><h3>'+esc(G[p.goal].label)+' · '+esc(L.FOCUS.find(f=>f[0]===p.focus)[1])+'</h3><span class="tag">about '+p.min+' min</span></div>'+
    '<p class="small muted" style="margin:6px 0">'+esc(G[p.goal].why)+(p.ss?' Exercises marked A and B are supersets: do one set of each back to back, then rest.':'')+'</p>';
    if(p.wake) h+='<div class="notice" style="margin:8px 0"><b>Wake-up flow (about 3 min):</b> '+L.WAKE.map(esc).join('. ')+'.</div>';
    h+='<p class="small muted">Warm up '+p.warm+' min with light sets of your first exercise.</p>'+p.items.map((it,i)=>planItemView(it,i,hist)).join('');
    h+='<div class="row" style="margin-top:12px"><button class="btn pri grow" data-act="rzstart">Start this session</button><button class="btn" data-act="rzshuffle">Shuffle</button></div>';
    h+='<p class="tiny muted" style="margin-top:10px">Sets, reps and loads follow the goal. Rest times are my defaults. Load suggestions come from your logged lifts. <a href="#" data-act="tab" data-v="library">Why this session</a></p></div>';
  }
  return h;
}
/* ---------- recovery + cardio ---------- */
const FEEL=['Flat','Low','OK','Good','Great'];
const MOOD=['Low','Flat','OK','Good','Great'], SORE=['None','Mild','Some','Sore','Very sore'], STR=['Weak','Down','Normal','Good','Strong'];
const recRow=(lbl,k,names,r)=>'<span class="lbl" style="margin-top:10px">'+lbl+'</span><div class="chips">'+names.map((w,i)=>'<button class="chip" data-act="recset" data-k="'+k+'" data-v="'+(i+1)+'" aria-pressed="'+(r[k]===i+1)+'">'+w+'</button>').join('')+'</div>';
function recoveryCard(){
  const t=today(); const r=(S.profile.rec||{})[t]||{}; const lvl=L.recLevel(r); 
  let h='<div class="card"><div class="row between"><h3>How are you today?</h3>'+(lvl?'<span class="tag '+(lvl==='low'?'r':lvl==='good'?'g':'')+'">'+(lvl==='low'?'Take it easier':lvl==='good'?'Good to go':'Normal day')+'</span>':'')+'</div>';
  h+='<span class="lbl" style="margin-top:8px">Sleep last night (hours)</span><div class="chips">'+[5,6,7,8,9].map(n=>'<button class="chip" data-act="recset" data-k="s" data-v="'+n+'" aria-pressed="'+(r.s===n)+'">'+(n===5?'5 or less':n===9?'9 or more':n)+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:10px">How fresh do you feel</span><div class="chips">'+FEEL.map((w,i)=>'<button class="chip" data-act="recset" data-k="f" data-v="'+(i+1)+'" aria-pressed="'+(r.f===i+1)+'">'+w+'</button>').join('')+'</div>';
  h+=recRow('Mood','m',MOOD,r)+recRow('Muscle soreness','o',SORE,r)+recRow('How strong do you feel','t',STR,r);
  if(lvl==='low') h+='<p class="small" style="margin-top:10px">Short on sleep or feeling flat. In the sleep research, heavy multi-joint lifts took the hit most. You can still train: keep weights where they feel safe and trim a set or two if form slips.</p>';
  else if(lvl==='good') h+='<p class="small" style="margin-top:10px">Rested and fresh. A good day to push your top sets.</p>';
  else if(lvl) h+='<p class="small" style="margin-top:10px">Fine to train as planned.</p>';
  L.trend(S.profile.rec||{},new Date(),S.profile.target,S.sessions,S.profile.fuel.goal).out.slice(0,2).forEach(x=>{ h+='<div class="notice" style="margin-top:10px">'+esc(x.t)+'</div>'; });
  return h+'<p class="tiny muted" style="margin-top:8px">All optional, about ten seconds. The advice rules are my own, informed by the sleep and deload studies in the Library.</p></div>';
}
function cardioCard(){
  const cd=S.ui.cd; const wk=L.cardioWeeks(S.profile.cardio,new Date(),1)[0].count; const list=[...(S.profile.cardio||[])].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0).slice(0,5);
  let h='<div class="card"><div class="row between"><h3>Cardio</h3><span class="tag">Aim 150 to 300 min</span></div><div style="margin:8px 0"><span class="big num">'+wk+'</span> <span class="muted">moderate minutes this week</span></div><div class="bar"><i style="width:'+Math.min(100,wk/150*100)+'%"></i></div>';
  h+='<p class="tiny muted" style="margin:6px 0 10px">WHO adults target: 150 to 300 moderate minutes a week (or 75 to 150 vigorous). Hard minutes count double here.</p>';
  h+='<span class="lbl">Type</span><div class="chips">'+['Walk','Run','Ride','Swim','Row','Other'].map(t=>'<button class="chip" data-act="cdset" data-k="type" data-v="'+t+'" aria-pressed="'+(cd.type===t)+'">'+t+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:10px">Effort</span><div class="chips">'+[['easy','Easy (can chat)'],['moderate','Moderate'],['hard','Hard']].map(x=>'<button class="chip" data-act="cdset" data-k="effort" data-v="'+x[0]+'" aria-pressed="'+(cd.effort===x[0])+'">'+x[1]+'</button>').join('')+'</div>';
  h+='<div class="grid2" style="margin-top:10px"><div><label class="lbl" for="cdm">Minutes</label><input id="cdm" type="number" inputmode="numeric" data-in="cdmin" value="'+esc(cd.min)+'"></div><div><label class="lbl" for="cdd">Date</label><input id="cdd" type="date" data-in="cddate" max="'+today()+'" value="'+esc(cd.date||today())+'"></div></div><button class="btn pri" style="width:100%;margin-top:10px" data-act="cdadd">Add cardio</button>';
  h+=list.map(x=>'<div class="li"><div class="grow"><b>'+esc(x.type)+'</b> <span class="muted num small">'+x.min+' min · '+esc(x.effort)+' · '+fdate(x.date)+'</span></div>'+ask('dc'+x.id,'Delete','delCardio',x.id)+'</div>').join('');
  return h+'<p class="tiny muted" style="margin-top:8px">Easy cardio should not get in the way of lifting gains in the review I found. Hard sessions are the part to space away from heavy leg days.</p></div>';
}
/* ---------- warm-up + stretching ---------- */
function warmupCard(a){
  if(S.profile.wuOn===false||a.past||a.editing) return '';
  const len=S.profile.wu||'std'; const w=L.warmup(a.ex.map(e=>e.key),len,S.sessions.length); a.wu=a.wu||{done:{}};
  const items=[{n:'Raise: '+(len==='quick'?'easy bike, row or brisk walk':'easy bike, row or brisk walk, until you are warm'),dose:w.raise,k:'__raise'}].concat(w.drills.map(d=>({n:d.n,dose:d.dose,k:d.n})));
  const done=items.filter(i=>a.wu.done[i.k]).length;
  let h='<div class="card"><div class="row between"><h3>Warm-up</h3><span class="tag '+(done===items.length?'g':'')+'">'+done+' of '+items.length+' · about '+w.min+' min</span></div>';
  if(w.areas.length&&S.ui.wuOpen) h+='<p class="small muted" style="margin-top:4px">Targets: '+esc(w.areas.join(', '))+'.</p>';
  h+='<div class="chips" style="margin-top:8px">'+[['quick','Quick'],['std','Standard'],['full','Full']].map(x=>'<button class="chip" data-act="wulen" data-v="'+x[0]+'" aria-pressed="'+(len===x[0])+'">'+x[1]+'</button>').join('')+'<button class="chip" data-act="wuopen" aria-pressed="false">'+(S.ui.wuOpen?'Hide':'Show')+'</button></div>';
  if(S.ui.wuOpen){
    h+=items.map(i=>'<div class="wu"><button class="tick '+(a.wu.done[i.k]?'on':'')+'" data-act="wutick" data-k="'+esc(i.k)+'" aria-pressed="'+!!a.wu.done[i.k]+'" aria-label="Mark '+esc(i.n)+' done">'+TICK+'</button><div class="grow"><b>'+esc(i.n)+'</b><div class="hint">'+esc(i.dose)+'</div></div></div>').join('');
    const f=a.ex[0]; let kg=f&&f.sets[0]?+f.sets[0].kg:0; const ramp=L.rampFor(kg);
    if(ramp) h+='<p class="small" style="margin-top:10px"><b>Optional ramp for '+esc(f.name)+':</b> '+ramp.map(r=>fk(r.kg)+' kg × '+r.reps).join(', ')+', then your working sets. Skip it if you are short on time.</p>';
    h+='<p class="tiny muted" style="margin-top:8px">Dynamic moves, not long static holds, before lifting. Drills are picked from the exercises in this session.</p>';
  }
  return h+'</div>';
}
function stretchCard(s){
  const list=L.stretchesFor((s.ex||[]).map(e=>e.key)); if(!list.length) return '';
  return '<div class="card"><h3>Stretch what you trained</h3><p class="small muted" style="margin:4px 0">Optional, 2 to 4 minutes. Hold each for about 30 seconds a side, to mild tension, not pain.</p>'+list.map(x=>'<div class="li"><span>'+esc(x)+'</span><span class="muted small">30 sec</span></div>').join('')+'<p class="tiny muted" style="margin-top:8px">Best done after training or on rest days. Static stretching right before lifting tends to cost a little strength.</p></div>';
}
/* ---------- train view ---------- */
function weekStrip(){
  const now=new Date(); const mon=L.mondayOf(now); const t=L.ymd(now); let h='<div class="wk" role="list">'; const names=['M','T','W','T','F','S','S'];
  for(let i=0;i<7;i++){ const d=L.ymd(L.addDays(mon,i)); const done=S.sessions.some(s=>s.date===d); const plan=(S.profile.days||[]).includes(i);
    h+='<div class="d '+(done?'done':plan?'plan':'')+(d===t?' today':'')+'" role="listitem" aria-label="'+fdate(d)+(done?' trained':plan?' planned':'')+'">'+(done?TICK.replace('<svg','<svg width="18" height="18" style="stroke:#fff;fill:none;stroke-width:3"'):names[i])+'</div>'; }
  return h+'</div>';
}
function greetLine(){
  const now=new Date(); const hr=now.getHours(); const hello=hr<11?'Good morning.':hr<17?'Good afternoon.':'Good evening.';
  const t=today(); const trainedToday=S.sessions.some(s=>s.date===t); const wk=L.weekCounts(S.sessions,now,1)[0].count; const tgt=S.profile.target;
  const last=S.sessions.reduce((m,s)=>s.date>m?s.date:m,''); const gap=last?Math.round((L.parseYmd(t)-L.parseYmd(last))/864e5):null;
  let line; const prog=activeProg(); const ptr=S.profile.ptr; const day=prog&&prog.weeks[ptr.w]&&prog.weeks[ptr.w].days[ptr.d];
  if(trainedToday) line='Logged for today. Recovery is part of the programme.';
  else if(wk>=tgt) line='Weekly target met. Anything extra is a bonus.';
  else if(gap!=null&&gap>=5) line='A few days off. Fifteen minutes still keeps the habit.';
  else if(day) line='Next on the sheet: '+day.name+', week '+(ptr.w+1)+'.';
  else line='Pick a session and get a number on the board.';
  return '<p class="greet"><b>'+hello.replace('.',S.profile.name?', '+esc(S.profile.name)+'.':'.')+'</b> '+esc(line)+'</p>';
}
function viewTrain(){
  const now=new Date(); const tgt=S.profile.target; const wk=L.weekCounts(S.sessions,now,1)[0].count; const st=L.streak(S.sessions,now,tgt); const total=S.sessions.length;
  let h=greetLine();
  { const age=backupAgeDays(); if(S.sessions.length>=3&&(age==null||age>14)) h+='<div class="notice" style="margin-bottom:12px">'+(age==null?'No backup yet.':'Last backup was '+age+' days ago.')+' Your log only lives on this phone. <button class="btn sm" data-act="'+(window.GK_BACKUP&&GK_BACKUP.available()?'backupnow':'exportjson')+'">Back up now</button></div>'; }
  if(S.active) h+='<div class="card" style="border-color:var(--blue)"><div class="row between"><div><span class="tag">In progress</span><h3 style="margin-top:6px">'+esc(S.active.title)+'</h3><p class="small muted">Started '+new Date(S.active.start).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})+'</p></div></div><div class="row" style="margin-top:10px"><button class="btn pri grow" data-act="resume">Resume</button>'+ask('discard','Discard','discardWork','')+'</div></div>';
  h+=recoveryCard();
  const need=Math.max(0,10-(total%10)); const n=L.plateCount(total);
  h+='<div class="card"><div class="row between"><div><span class="lbl" style="margin:0">This week</span><div class="big num">'+wk+' <span class="muted" style="font-size:22px">/ '+tgt+'</span></div></div><div style="text-align:right"><span class="lbl" style="margin:0">Streak</span><div class="big num">'+st+'<span class="muted" style="font-size:22px"> wk</span></div></div></div>'+
    '<div style="margin:12px 0">'+weekStrip()+'</div><p class="tiny muted">Filled = trained. Outlined = planned. A week counts toward your streak with '+Math.max(1,tgt-1)+' or more sessions, so one miss does not break it.</p></div>';
  h+='<div class="card"><div class="row between"><h3>Your bar</h3><span class="tag y num">'+total+' sessions</span></div>'+barbell(total)+'<p class="small muted">'+(n>=6?'Fully loaded, collars on. The bar is as heavy as it gets.':(n+' plate'+(n===1?'':'s')+' a side. '+need+' more session'+(need===1?'':'s')+' for the next plate.'))+'</p></div>';
  const prog=activeProg(); const hist0=L.buildHist(S.sessions);
  if(prog){ const ptr=S.profile.ptr; const wk0=prog.weeks[ptr.w]; const day=wk0&&wk0.days[ptr.d];
    h+='<div class="card"><div class="row between"><h2>Next up</h2><span class="tag">'+esc(prog.name)+'</span></div>';
    if(day){ h+='<p style="margin:4px 0 8px"><b>Week '+(ptr.w+1)+', day '+(ptr.d+1)+': '+esc(day.name)+'</b></p>'+(S.profile.wuOn===false?'':'<p class="small muted" style="margin-bottom:8px">Warm-up focus: '+esc(L.warmupAreas(day.ex.map(e=>e.key)).join(', ')||'whole body')+'</p>')+(ptr.done?'<p class="small muted" style="margin-bottom:6px">You reached the end of this program. Repeat the last day, load a new program, or train off the book.</p>':'')+
      '<div>'+day.ex.map(e=>{ const hh=(hist0[e.key]||[])[0]; let kg=e.kg; if(hh&&(kg==null||hh.topKg>kg)) kg=hh.topKg; const rs0=e.rpe!=null?rpeSug(e,hist0):null; const wt=rs0?'RPE '+e.rpe+' · ~'+fk(rs0.kg)+' kg':kg!=null?fk(kg)+' kg'+(e.per?' '+e.per:''):(e.rpe!=null?(function(){ const rs=rpeSug(e,hist0); return 'RPE '+e.rpe+(rs?' · ~'+fk(rs.kg)+' kg':(hh?' · last '+fk(hh.topKg)+' kg':'')); })():(e.raw?esc(e.raw):'')); return '<div class="li" style="padding:6px 0"><span>'+(e.ss?'<span class="ss">'+e.ss+'</span>':'')+esc(e.name)+'</span><span class="num small" style="text-align:right">'+e.sets+' × '+esc(e.repsText)+(wt?'<br><b>'+wt+'</b>':'')+'</span></div>'; }).join('')+'</div>'+
      '<div class="row" style="margin-top:12px"><button class="btn pri grow" data-act="startprog" data-w="'+ptr.w+'" data-d="'+ptr.d+'">Start</button><button class="btn" data-act="skipday">Skip day</button><button class="btn ghost" data-act="gotoplan">Change</button></div>'; }
    else h+='<p class="muted">This program has no sessions at this point.</p>';
    h+='</div>'; }
  else h+='<div class="card"><h2>No program yet</h2><p class="small muted" style="margin:4px 0 10px">Add one in Plan, or train off the book below.</p><button class="btn" data-act="tab" data-v="plan">Open Plan</button></div>';
  h+=randomiserView();
  h+=cardioCard();
  h+='<div class="card"><div class="row between"><h3>Free session</h3><button class="btn sm" data-act="startfree">Start empty</button></div><p class="small muted">Log whatever you like without a plan.</p></div>';
  const yd=L.ymd(L.addDays(new Date(),-1));
  h+='<div class="card"><h3>Missed logging a session?</h3><p class="small muted" style="margin:4px 0 10px">Pick the date it happened, then choose what you did. It counts toward that week and your history.</p><label class="lbl" for="logd">Date</label><input type="date" id="logd" max="'+today()+'" value="'+yd+'"><div class="row" style="margin-top:10px">'+(prog?'<button class="btn" data-act="pastprog">Next program day</button>':'')+'<button class="btn" data-act="pastrz">Built session above</button><button class="btn" data-act="pastfree">Empty</button></div></div>';
  const rec=[...S.sessions].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.start||0)-(a.start||0)).slice(0,6);
  if(rec.length){ h+='<div class="card"><h3>Recent</h3>'+rec.map(s=>'<div class="li"><div class="grow" data-act="opensess" data-id="'+esc(s.id)+'" style="cursor:pointer"><b>'+esc(s.title)+' <span class="chev" aria-hidden="true">›</span></b><div class="hint num">'+fdate(s.date)+' · '+(s.ex||[]).reduce((a,e)=>a+(e.sets||[]).length,0)+' sets · '+L.sessionVolume(s).toLocaleString('en-AU')+' kg moved</div></div>'+'<div class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-act="editsess" data-id="'+esc(s.id)+'">Edit</button>'+ask('ds'+s.id,'Delete','delSess',s.id)+'</div></div>').join('')+'</div>';
    const prs=[]; rec.slice(0,4).forEach(s=>L.prsFor(s,S.sessions).filter(p=>p.type==='pr').forEach(p=>prs.push({d:s.date,p})));
    if(prs.length) h+='<div class="card"><h3>Recent PRs</h3>'+prs.slice(0,6).map(x=>'<div class="li"><span><span class="tag y">PR</span> '+esc(x.p.name)+'</span><span class="num small muted">'+Math.round(x.p.e1)+' kg est. 1RM · '+fdate(x.d)+'</span></div>').join('')+'</div>'; }
  return h;
}
/* ---------- workout view ---------- */
function setRow(e,i,j){
  const s=e.sets[j]; return '<div class="n">'+(j+1)+'</div><input inputmode="decimal" aria-label="Set '+(j+1)+' weight in kg" data-set="1" data-i="'+i+'" data-j="'+j+'" data-f="kg" value="'+esc(s.kg)+'" placeholder="kg"><input inputmode="numeric" aria-label="Set '+(j+1)+(e.target.timed?' seconds':' reps')+'" data-set="1" data-i="'+i+'" data-j="'+j+'" data-f="reps" value="'+esc(s.reps)+'" placeholder="'+esc(s.tr===''||s.tr==null?(e.target.timed?'sec':'reps'):s.tr)+'"><button class="tick '+(s.done?'on':'')+'" data-act="tick" data-i="'+i+'" data-j="'+j+'" aria-pressed="'+s.done+'" aria-label="Mark set '+(j+1)+' done">'+TICK+'</button>';
}
function exCard(e,i,hist){
  const t=e.target; const h=(hist[e.key]||[])[0];
  const meta=[t.repsText?t.sets+' × '+t.repsText:t.sets+' sets',t.rpe?('RPE '+t.rpe):'',t.rest?('rest '+t.rest+'s'):''].filter(Boolean).join(' · ');
  let x='<div class="ex '+(e.ss?'ssb':'')+'"><div class="row between"><div class="grow">'+(e.ss?'<span class="ss">'+e.ss+'</span>':'')+'<span class="exn">'+esc(e.name)+'</span></div>'+ask('rx'+e.id,'Remove','rmex',String(i))+'</div>';
  x+='<div class="hint num">'+esc(meta)+'</div>'+(t.raw?'<div class="hint">Sheet: '+esc(t.raw)+'</div>':'')+(e.note?'<div class="hint">'+esc(e.note)+'</div>':'');
  if(h) x+='<div class="hint num">Last: '+h.sets.map(s=>fk(s.kg)+'×'+s.reps).join(', ')+' · '+fdate(h.date)+'</div>';
  if(e.sug) x+='<div class="hint b num">Try '+fk(e.sug.kg)+' kg × '+e.sug.reps+' <button class="btn sm ghost" data-act="usesug" data-i="'+i+'">Use</button></div><div class="hint">'+esc(e.sug.note)+'</div>';
  x+='<div class="sets"><span class="hdr">Set</span><span class="hdr">kg used</span><span class="hdr">'+(t.timed?'Sec':'Reps')+'</span><span class="hdr">Done</span>';
  e.sets.forEach((s,j)=>{ x+=setRow(e,i,j); }); x+='</div>';
  x+='<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="addset" data-i="'+i+'">+ Set</button><button class="btn sm ghost" data-act="rmset" data-i="'+i+'">− Set</button></div></div>';
  return x;
}
function viewWorkout(){
  const a=S.active; const hist=L.buildHist(S.sessions); const done=a.ex.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
  let h='<div class="top"><div class="grow"><h2>'+(a.editing?'Editing: ':'')+esc(a.title)+'</h2><div class="small muted num">'+(a.past?'':'<span id="elapsed"></span> · ')+done+' sets done</div></div><button class="btn sm" data-act="leave">Back</button></div>';
  const rl=L.recLevel((S.profile.rec||{})[today()]); if(rl==='low'&&!a.past) h+='<div class="notice" style="margin-bottom:10px">Low recovery today. Keep weights where they feel safe and trim a set or two if form slips.</div>';
  h+=warmupCard(a);
  if(a.wake){ h+='<div class="notice" style="margin-bottom:10px"><b>Wake-up flow first:</b> '+L.WAKE.map(esc).join('. ')+'.</div>'; }
  h+='<div class="card"><label class="lbl" for="wdate">Date of this session</label><input type="date" id="wdate" data-in="wdate" max="'+today()+'" value="'+esc(a.date)+'">'+(a.past?'<p class="tiny muted" style="margin-top:6px">Logging for an earlier date. No timer or rest countdown.</p>':'')+'</div>';
  const rb=S.profile.rest; h+='<div class="row" style="margin-bottom:10px"><button class="chip" data-act="resttoggle" aria-pressed="'+rb+'">Rest timer '+(rb?'on':'off')+'</button><button class="chip" data-act="awaketoggle" aria-pressed="'+!!S.profile.awake+'">Screen '+(S.profile.awake?'stays on':'can sleep')+'</button></div>';
  h+=a.ex.map((e,i)=>exCard(e,i,hist)).join('');
  const mine=Object.values(hist).map(x=>x[0].name); EXNAMES={mine:new Set(mine.map(n=>L.keyOf(n))),all:[...new Set(mine.concat(L.DB.map(e=>e.n)))]}; EXNAMES.txt={}; EXNAMES.all.forEach(n=>{ const t=L.tagFor(L.keyOf(n)); EXNAMES.txt[n]=(n+' '+(TAGWORDS[t]||'')).toLowerCase(); });
  h+='<div class="card" id="addcard"><label class="lbl" for="addex">Add an exercise</label><div class="row"><input class="grow" id="addex" data-in="addex" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="Start typing a name" value="'+esc(S.ui.addEx)+'"><button class="btn" data-act="addex">Add</button></div><div id="exsug" class="exsug" role="listbox" aria-label="Matching exercises">'+exSugHTML(S.ui.addEx)+'</div></div>';
  h+='<div class="card"><label class="lbl" for="wnotes">Notes</label><textarea id="wnotes" data-in="wnotes" placeholder="How did it feel?">'+esc(a.notes)+'</textarea></div>';
  h+='<div class="row"><button class="btn pri grow" data-act="finish">Finish workout</button>'+ask('discardw','Discard','discardWork','')+'</div>';
  return h;
}
function viewSummary(){
  const x=S.ui.summary; const s=x.s; const now=new Date(); const wk=L.weekCounts(S.sessions,now,1)[0].count; const sets=s.ex.reduce((a,e)=>a+e.sets.length,0);
  const mins=Math.max(1,Math.round(s.dur/60)); const prs=x.prs.filter(p=>p.type==='pr'||p.type==='weight'); const base=x.prs.filter(p=>p.type==='baseline');
  let h='<div class="top"><h2>Session logged</h2></div><div class="knurl" aria-hidden="true"></div><div class="card"><div class="kv"><div><b class="num">'+mins+'</b><span>minutes</span></div><div><b class="num">'+sets+'</b><span>sets</span></div><div><b class="num">'+L.sessionVolume(s).toLocaleString('en-AU')+'</b><span>kg moved</span></div></div></div>';
  if(prs.length) h+='<div class="card" style="border-color:var(--yellow)"><h3>New bests</h3>'+prs.map(p=>'<div class="li"><span><span class="tag y">'+(p.type==='pr'?'PR':'Heaviest')+'</span> '+esc(p.name)+'</span><span class="num small">'+(p.type==='pr'?Math.round(p.e1)+' kg est. 1RM (was '+Math.round(p.prev)+')':fk(p.kg)+' kg (was '+fk(p.prev)+')')+'</span></div>').join('')+'</div>';
  if(base.length) h+='<div class="card"><h3>Baselines set</h3><p class="small muted">First time logging these. Future sessions get compared against them.</p>'+base.map(p=>'<div class="li"><span>'+esc(p.name)+'</span><span class="num small muted">'+Math.round(p.e1)+' kg est. 1RM</span></div>').join('')+'</div>';
  h+=stretchCard(s);
  h+='<div class="card"><p><b>'+wk+' of '+S.profile.target+'</b> sessions this week. '+(wk>=S.profile.target?'Week target hit.':(S.profile.target-wk)+' to go.')+'</p></div>';
  h+='<button class="btn pri" style="width:100%" data-act="donesum">Done</button>';
  return h;
}
