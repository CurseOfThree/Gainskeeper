/* ---------- plan view ---------- */
const MAIN={'back squat':'squat','bench press':'bench','deadlift':'deadlift'};
function loadText(e){
  if(e.kg!=null) return fk(e.kg)+' kg'+(e.per?' '+e.per:'');
  if(e.rpe!=null) return 'RPE '+e.rpe+(e.guess!=null?' (sheet says '+fk(e.guess)+')':'');
  return e.raw?esc(e.raw):'';
}
function viewPlan(){
  const t=S.ui.planTab; let h='<div class="sub" role="tablist">'+[['program','Program'],['import','Add program'],['settings','Settings']].map(x=>'<button class="chip" role="tab" data-act="plantab" data-v="'+x[0]+'" aria-pressed="'+(t===x[0])+'">'+x[1]+'</button>').join('')+'</div>';
  if(t==='program') h+=planProgram(); else if(t==='import') h+=planImport(); else h+=planSettings();
  return h;
}
function planProgram(){
  if(!S.programs.length) return '<div class="card"><p class="muted">No programs yet. Use Add program.</p></div>';
  const pid=S.ui.bpid||S.profile.activePid||S.programs[0].id; const prog=S.programs.find(p=>p.id===pid)||S.programs[0]; const isAct=prog.id===S.profile.activePid;
  let w=S.ui.bw; if(w==null||w>=prog.weeks.length) w=isAct?Math.min(S.profile.ptr.w,prog.weeks.length-1):0; let d=S.ui.bd||0;
  const wk=prog.weeks[w]; if(!wk) return '<div class="card"><p class="muted">This program is empty.</p></div>'; if(d>=wk.days.length) d=0; const day=wk.days[d];
  let h='';
  if(S.programs.length>1) h+='<div class="card"><span class="lbl">Programs</span><div class="chips">'+S.programs.map(p=>'<button class="chip" data-act="pickprog" data-id="'+esc(p.id)+'" aria-pressed="'+(p.id===prog.id)+'">'+esc(p.name)+(p.id===S.profile.activePid?' (active)':'')+'</button>').join('')+'</div></div>';
  h+='<div class="card"><div class="row between"><h2>'+esc(prog.name)+'</h2>'+(isAct?'<span class="tag g">Active</span>':'')+'</div><p class="small muted">'+prog.weeks.length+' weeks · '+wk.days.length+' days a week</p>';
  h+='<span class="lbl" style="margin-top:12px">Week</span><div class="chips">'+prog.weeks.map((x,i)=>'<button class="chip" style="min-width:44px;padding:7px 8px" data-act="bweek" data-v="'+i+'" aria-pressed="'+(i===w)+'">'+(i+1)+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:12px">Day</span><div class="chips">'+wk.days.map((x,i)=>'<button class="chip" data-act="bday" data-v="'+i+'" aria-pressed="'+(i===d)+'">'+esc(x.name)+'</button>').join('')+'</div></div>';
  const rm=wk.rm||{};
  h+='<div class="card"><div class="row between"><h3>'+esc(day.name)+'</h3><span class="tag">Week '+(w+1)+'</span></div>'+(Object.keys(rm).length?'<p class="tiny muted" style="margin-top:4px">Block 1RMs: '+Object.keys(rm).map(k=>k+' '+rm[k]).join(', ')+' kg</p>':'');
  h+=day.ex.map(e=>{ const m=MAIN[e.key]; const pct=(m&&e.kg&&rm[m])?' · '+Math.round(e.kg/rm[m]*100)+'%':''; return '<div class="li"><div class="grow">'+(e.ss?'<span class="ss">'+e.ss+'</span>':'')+'<span class="exn">'+esc(e.name)+'</span>'+(e.note?'<div class="hint">'+esc(e.note)+'</div>':'')+'</div><div class="num small" style="text-align:right">'+e.sets+' × '+esc(e.repsText)+'<div class="muted">'+loadText(e)+pct+'</div></div></div>'; }).join('');
  h+='<div class="row" style="margin-top:12px">';
  if(isAct) h+='<button class="btn pri grow" data-act="startprog" data-w="'+w+'" data-d="'+d+'">Start this day</button><button class="btn" data-act="setptr" data-w="'+w+'" data-d="'+d+'">Make next</button>';
  else h+='<button class="btn pri grow" data-act="useprog" data-id="'+esc(prog.id)+'">Use this program</button>';
  h+='</div><p class="tiny muted" style="margin-top:8px">Loads come from the sheet and are only starting points. Some sheet numbers mix kg and pounds, so check them and your logged weights take over once you have history. Pull-up and band loads are left blank.</p></div>';
  h+='<div class="card">'+ask('dp'+prog.id,'Delete this program','delProg',prog.id)+'</div>';
  return h;
}
function impPreview(){
  const r=S.ui.imp.res; if(!r) return ''; if(!r.prog) return '<div class="err" role="alert">'+r.warn.map(esc).join('<br>')+'</div>';
  const p=r.prog; const days=p.weeks.map(w=>w.days.length); const first=p.weeks[0]; const exN=p.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+d.ex.length,0),0);
  let h='<div class="card"><h3>Preview</h3><label class="lbl" for="impname" style="margin-top:8px">Name</label><input id="impname" data-in="impname" value="'+esc(r.name||p.name)+'">';
  h+='<p class="small muted" style="margin:8px 0">'+p.weeks.length+' weeks · '+Math.max(...days)+' days a week · '+exN+' exercise entries</p>';
  if(r.warn&&r.warn.length) h+='<div class="notice" style="margin-bottom:8px">'+r.warn.slice(0,6).map(esc).join('<br>')+'</div>';
  if(first) h+=first.days.map(d=>'<div class="li"><div><b>'+esc(d.name)+'</b><div class="hint">'+d.ex.map(e=>esc(e.name)).join(', ')+'</div></div></div>').join('');
  h+='<div class="row" style="margin-top:12px"><button class="btn pri grow" data-act="impsave" data-a="1">Save and make active</button><button class="btn" data-act="impsave" data-a="0">Save only</button></div></div>';
  return h;
}
function planImport(){
  const im=S.ui.imp; const can=S.cap.sample;
  let h='<div class="card"><h2>Add a program</h2><p class="small muted" style="margin:4px 0 10px">Paste it as text, upload a text, CSV or JSON file.</p>';
  h+='<label class="lbl" for="imptext">Program text</label><textarea id="imptext" data-in="imptext" placeholder="week,day,exercise,sets,reps,load,rpe,note">'+esc(im.text)+'</textarea>';
  h+='<div class="row" style="margin-top:10px"><label class="btn sm" style="display:inline-flex;align-items:center">Upload file<input type="file" class="sr" id="impfile" data-in="impfile" accept=".txt,.csv,.json,.md,text/*,application/json'+(S.cap.images?',image/*':'')+'"></label><span class="tiny muted">'+(im.images.length?im.images.length+' photo'+(im.images.length>1?'s':'')+' attached':'')+'</span></div>';
  h+='<div class="row" style="margin-top:10px"><button class="btn pri grow" data-act="impread">Read it</button>'+(can?'<button class="btn grow" data-act="impclaude"'+(im.busy?' disabled':'')+'>'+(im.busy?'Claude is reading...':'Ask Claude to read it')+'</button>':'')+'</div>';
  if(im.err) h+='<div class="err" role="alert" style="margin-top:10px">'+esc(im.err)+'</div>';
  h+='<p class="tiny muted" style="margin-top:10px">PDFs cannot be opened here. Paste the text from the PDF, or send the PDF to me in chat and I will add it for you.</p></div>';
  h+=impPreview();
  h+='<div class="card"><details><summary>Formats it understands</summary><div class="small stack" style="margin-top:8px"><p><b>CSV</b> with a header row. Columns: week, day, exercise, sets, reps, load, rpe, note. Reps can be a range such as 8-10. Load can be 80, 80kg or 175lb.</p><p><b>JSON</b> as {"name":"...","weeks":[{"days":[{"name":"Day 1","exercises":[{"name":"Squat","sets":3,"reps":"5","load":"100kg"}]}]}]}</p><p><b>Short text format</b> (what the built-in program uses):</p><pre class="small scroll" style="margin:0;padding:8px;background:var(--raised);border:1px solid var(--line);border-radius:8px">NAME My program\nBLOCK 1 | squat=140 bench=100 | weeks=4\nDAY Lower\nSQUAT | 3x5;100 | 3x5;102.5 | 3x5;105 | 3x3;110\nA) LUNGES | 3x10EL;10kg\nDAY Upper\nBENCH | 3x5;80</pre><p class="muted">A row with one cell repeats across the block. Put A) or B) in front of a name for supersets.</p></div></details></div>';
  return h;
}
function planSettings(){
  const p=S.profile; const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const eqn=[['bb','Barbell'],['db','Dumbbells'],['mach','Machines'],['cable','Cables'],['kb','Kettlebells']];
  let h='<div class="card"><h3>Weekly target</h3><div class="chips" style="margin-top:8px">'+[2,3,4,5,6].map(n=>'<button class="chip" data-act="settarget" data-v="'+n+'" aria-pressed="'+(p.target===n)+'">'+n+' sessions</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:14px">Planned days</span><div class="chips">'+dn.map((n,i)=>'<button class="chip" data-act="setday" data-v="'+i+'" aria-pressed="'+((p.days||[]).includes(i))+'">'+n+'</button>').join('')+'</div></div>';
  h+='<div class="card"><h3>Equipment for random sessions</h3><p class="small muted" style="margin:4px 0 8px">Bodyweight is always on.</p><div class="chips">'+eqn.map(x=>'<button class="chip" data-act="seteq" data-v="'+x[0]+'" aria-pressed="'+(p.eq[x[0]]!==false)+'">'+x[1]+'</button>').join('')+'</div></div>';
  h+='<div class="card"><h3>Warm-up</h3><p class="small muted" style="margin:4px 0 8px">A short dynamic warm-up built from the muscles in each session, shown at the top of your workout.</p><div class="chips"><button class="chip" data-act="wuon" aria-pressed="'+(p.wuOn!==false)+'">'+(p.wuOn!==false?'On':'Off')+'</button>'+[['quick','Quick (about 4 min)'],['std','Standard (about 7)'],['full','Full (about 10)']].map(x=>'<button class="chip" data-act="wulen" data-v="'+x[0]+'" aria-pressed="'+((p.wu||'std')===x[0])+'">'+x[1]+'</button>').join('')+'</div></div>';
  h+='<div class="card"><h3>Progression suggestions</h3><p class="small muted" style="margin:4px 0 8px">For off-book sessions only. When you hit the top of the rep range on every set, it suggests a small load jump (about 2.5%). Otherwise it suggests the same load and one more rep. Your program keeps its own progression.</p><button class="chip" data-act="setprog" aria-pressed="'+(p.prog!==false)+'">'+(p.prog!==false?'On':'Off')+'</button></div>';
  h+='<div class="card"><h3>Your data</h3><p class="small muted" style="margin:4px 0 8px" id="sync2">'+esc(syncText())+'.</p><div class="row">'+(S.cap.downloads?'<button class="btn sm" data-act="exportjson">Back up (JSON)</button><button class="btn sm" data-act="exportcsv">Sessions (CSV)</button>':'<span class="small muted">Backups are not available here.</span>')+'</div><label class="lbl" style="margin-top:12px" for="restore">Restore from a backup file</label><input type="file" id="restore" data-in="restore" accept=".json,application/json"></div>';
  return h;
}
/* ---------- progress view ---------- */
function viewProgress(){
  const hist=L.buildHist(S.sessions); const keys=Object.keys(hist).sort((a,b)=>hist[b].length-hist[a].length);
  const now=new Date(); const wc=L.weekCounts(S.sessions,now,12); const cut=L.ymd(L.addDays(now,-30)); const recent=S.sessions.filter(s=>s.date>=cut);
  let h='<div class="card"><h3>Consistency</h3>'+bars(wc,S.profile.target)+'<p class="tiny muted">Dashed line is your weekly target. Green weeks counted toward your streak.</p></div>';
  h+='<div class="card"><div class="kv"><div><b class="num">'+S.sessions.length+'</b><span>sessions</span></div><div><b class="num">'+recent.length+'</b><span>last 30 days</span></div><div><b class="num">'+Math.round(recent.reduce((a,s)=>a+L.sessionVolume(s),0)/1000*10)/10+'</b><span>tonnes, 30 days</span></div></div></div>';
  const rs=L.recStats(S.profile.rec||{},new Date(),7);
  h+='<div class="card"><h3>Recovery</h3>'+(rs.seen?'<div class="kv" style="margin-top:8px"><div><b class="num">'+(rs.sleep?rs.sleep.toFixed(1):'-')+'</b><span>avg sleep hrs, 7 days</span></div><div><b class="num">'+(rs.feel?rs.feel.toFixed(1):'-')+'</b><span>avg feel (1 to 5)</span></div><div><b class="num">'+rs.low+'</b><span>low days of '+rs.seen+'</span></div></div>':'<p class="small muted" style="margin-top:6px">Answer the check-in on Train to start building this picture.</p>')+'</div>';
  h+='<div class="card"><h3>Cardio, weekly</h3>'+bars(L.cardioWeeks(S.profile.cardio,now,12),150)+'<p class="tiny muted">Moderate minutes, hard minutes counted double. Dashed line is 150.</p></div>';
  h+=measCard();
  const prog=activeProg(); const rmw=prog&&prog.weeks[Math.min(S.profile.ptr.w,prog.weeks.length-1)]; const rm=(rmw&&rmw.rm)||{};
  const mains=[['back squat','Squat','squat'],['bench press','Bench','bench'],['deadlift','Deadlift','deadlift']];
  h+='<div class="card"><h3>Main lifts</h3><p class="small muted" style="margin:2px 0 8px">Best estimated 1RM from your logs, against the block 1RM in your program.</p><div class="kv">'+mains.map(m=>{ const x=hist[m[0]]; const best=x?Math.round(Math.max(...x.map(y=>y.e1))):null; return '<div><b class="num">'+(best?best:'-')+'</b><span>'+m[1]+(rm[m[2]]?' · program '+rm[m[2]]:'')+'</span></div>'; }).join('')+'</div></div>';
  if(!keys.length){ h+='<div class="card"><p class="muted">Log a session and your lifts show up here, with a chart for each.</p></div>'; return h; }
  const key=(S.ui.progKey&&hist[S.ui.progKey])?S.ui.progKey:keys[0]; const x=[...hist[key]].sort((a,b)=>a.date<b.date?-1:1);
  const pts=x.map(y=>({x:L.parseYmd(y.date).getTime(),y:Math.round(y.e1*10)/10})); const best=Math.max(...x.map(y=>y.e1)); const first=x[0].e1;
  h+='<div class="card"><label class="lbl" for="pk">Exercise</label><select id="pk" data-in="progkey">'+keys.map(k=>'<option value="'+esc(k)+'"'+(k===key?' selected':'')+'>'+esc(hist[k][0].name)+' ('+hist[k].length+')</option>').join('')+'</select>';
  h+='<div style="margin-top:12px">'+chart(pts,{best:true,label:'Estimated one rep max over time'})+'</div><p class="tiny muted">Estimated one rep max, from weight × (1 + reps ÷ 30). It is a guide, and is less reliable above about 10 reps.</p>';
  h+='<div class="kv" style="margin-top:10px"><div><b class="num">'+Math.round(best)+'</b><span>best est. 1RM</span></div><div><b class="num">'+Math.max(...x.map(y=>y.topKg))+'</b><span>heaviest kg</span></div><div><b class="num">'+(x.length>1?(best>=first?'+':'')+Math.round((best-first)/first*100)+'%':'-')+'</b><span>since first</span></div></div>';
  h+=[...x].reverse().slice(0,8).map(y=>'<div class="li"><span>'+fdate(y.date)+'</span><span class="num small">'+y.sets.map(s=>fk(s.kg)+'×'+s.reps).join(', ')+'</span></div>').join('')+'</div>';
  return h;
}

const MFIELDS=[['waist','Waist'],['chest','Chest'],['arm','Arm'],['thigh','Thigh']];
function measCard(){
  const ms=[...(S.profile.meas||[])].sort((a,b)=>a.d<b.d?-1:1); const m=S.ui.ms;
  let h='<div class="card"><h3>Measurements</h3><p class="small muted" style="margin:4px 0 8px">Every few weeks, same spot, same time of day. Useful in a recomp when the scale hides what is changing.</p>';
  if(ms.length){ h+='<div class="kv">'+MFIELDS.map(f=>{ const v=ms.filter(x=>x[f[0]]>0); if(!v.length) return '<div><b class="num">-</b><span>'+f[1]+'</span></div>'; const last=v[v.length-1][f[0]],first=v[0][f[0]]; const dd=Math.round((last-first)*10)/10; return '<div><b class="num">'+last+'</b><span>'+f[1]+' cm'+(v.length>1?' ('+(dd>0?'+':'')+dd+')':'')+'</span></div>'; }).join('')+'</div>'; }
  h+='<div class="grid2" style="margin-top:12px">'+MFIELDS.map(f=>'<div><label class="lbl" for="m'+f[0]+'">'+f[1]+' (cm)</label><input id="m'+f[0]+'" type="number" inputmode="decimal" data-in="ms" data-k="'+f[0]+'" value="'+esc(m[f[0]])+'"></div>').join('')+'<div><label class="lbl" for="mdate">Date</label><input id="mdate" type="date" data-in="ms" data-k="d" max="'+today()+'" value="'+esc(m.d||today())+'"></div></div><button class="btn pri" style="width:100%;margin-top:10px" data-act="msadd">Save measurements</button>';
  h+=[...ms].reverse().slice(0,5).map(x=>'<div class="li"><div class="grow"><b>'+fdate(x.d)+'</b><div class="hint num">'+MFIELDS.filter(f=>x[f[0]]>0).map(f=>f[1]+' '+x[f[0]]).join(' · ')+'</div></div><button class="btn sm ghost" data-act="msdel" data-id="'+esc(x.id)+'">Delete</button></div>').join('');
  return h+'</div>';
}
/* ---------- first-run setup ---------- */
function viewSetup(){
  const p=S.profile; const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const eqn=[['bb','Barbell'],['db','Dumbbells'],['mach','Machines'],['cable','Cables'],['kb','Kettlebells']];
  let h='<div style="padding:12px 0 24px"><div class="brand" style="margin:8px 0 4px"><div><h1 style="margin:0">Gainskeeper</h1><small>Strength and shape, kept.</small></div></div><div class="knurl" style="margin:12px 0"></div>';
  h+='<div class="card"><h2>Set up</h2><p class="small muted" style="margin:4px 0 10px">Everything stays on this phone. You can change any of this later in Plan, Settings.</p>';
  h+='<label class="lbl" for="sname">What should I call you?</label><input id="sname" data-in="setname" type="text" autocomplete="off" maxlength="30" value="'+esc(p.name||'')+'" placeholder="Name">';
  h+='<span class="lbl" style="margin-top:14px">Used for calorie and protein estimates</span><div class="chips">'+[['m','Male'],['f','Female']].map(x=>'<button class="chip" data-act="fsex" data-v="'+x[0]+'" aria-pressed="'+(p.fuel.sex===x[0])+'">'+x[1]+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:14px">Sessions a week</span><div class="chips">'+[2,3,4,5,6].map(n=>'<button class="chip" data-act="settarget" data-v="'+n+'" aria-pressed="'+(p.target===n)+'">'+n+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:14px">Planned days</span><div class="chips">'+dn.map((n,i)=>'<button class="chip" data-act="setday" data-v="'+i+'" aria-pressed="'+((p.days||[]).includes(i))+'">'+n+'</button>').join('')+'</div>';
  h+='<span class="lbl" style="margin-top:14px">Equipment for random sessions</span><div class="chips">'+eqn.map(x=>'<button class="chip" data-act="seteq" data-v="'+x[0]+'" aria-pressed="'+(p.eq[x[0]]!==false)+'">'+x[1]+'</button>').join('')+'</div>';
  h+='<p class="tiny muted" style="margin-top:12px">Already have a backup from another phone? Finish here, then restore it in Plan, Settings.</p>';
  h+='<button class="btn pri" style="width:100%;margin-top:14px" data-act="setupdone">Start</button></div></div>';
  return h;
}
