/* ---------- fuel view ---------- */
function sortedW(){ return [...S.profile.weights].sort((a,b)=>a.d<b.d?-1:1); }
function latestW(){ const w=sortedW(); return w.length?w[w.length-1].kg:null; }
function fuelCalc(){
  const f=S.profile.fuel; const w=latestW(); const ex=!(+f.age&&+f.h&&w);
  const r=L.nutrition({sex:f.sex,age:+f.age||30,h:+f.h||178,w:w||80,bf:f.bf,lean:f.lean,act:f.act,goal:f.goal,rate:f.rate,meals:f.meals,fat:f.fat});
  return {r,ex,w:w||80};
}
function fuelOut(){
  const f=S.profile.fuel; const {r,ex}=fuelCalc(); const gl={cut:'Lose fat',recomp:'Recomp (build and lose)',gain:'Build muscle'}[f.goal];
  let h='';
  if(ex) h+='<div class="notice" style="margin-bottom:10px">These are example numbers for a 30 year old, 178 cm, 80 kg man. Fill in your age, height and weight above to get yours.</div>';
  h+='<div class="card"><div class="row between"><h3>Daily target</h3><span class="tag">'+esc(gl)+'</span></div><div style="margin:8px 0"><span class="big num">'+r.kcal.toLocaleString('en-AU')+'</span> <span class="muted">kcal</span></div><p class="small muted">'+r.dir+' of '+Math.abs(r.adj)+' kcal against maintenance ('+r.tdee.toLocaleString('en-AU')+').</p>';
  h+='<div class="macro" style="margin-top:12px"><div><b class="num">'+r.protein+' g</b><span class="small muted">Protein (range '+r.pLo+' to '+r.pHi+')</span></div><div><b class="num">'+r.carbs+' g</b><span class="small muted">Carbs</span></div><div><b class="num">'+r.fat+' g</b><span class="small muted">Fat</span></div><div><b class="num">'+r.perMeal+' g</b><span class="small muted">Protein per meal, '+(+f.meals||4)+' meals</span></div></div>';
  if(r.warn.length) h+='<div class="notice" style="margin-top:10px">'+r.warn.map(esc).join('<br>')+'</div>';
  h+='<p class="tiny muted" style="margin-top:10px">Base rate by '+esc(r.method)+': '+r.bmr+' kcal. Protein basis: '+esc(r.pBasis)+(r.ffm?'. Lean mass used: '+r.ffm+' kg':'')+'.</p></div>';
  return h;
}
function checkinView(){
  const f=S.profile.fuel; const ws=S.profile.weights; const c=L.checkin(ws,f.goal,f.rate,new Date());
  let h='<div class="card"><h3>Weekly check-in</h3>';
  if(!c.ok) return h+'<p class="small muted" style="margin-top:6px">'+c.msg+'</p></div>';
  h+='<p class="small" style="margin:6px 0">7 day average <b class="num">'+c.a.toFixed(1)+' kg</b> against <b class="num">'+c.b.toFixed(1)+' kg</b> the week before ('+(c.pct>=0?'+':'')+c.pct.toFixed(2)+'% a week).</p><p>'+esc(c.msg)+'</p></div>'; return h;
}
function weightView(){
  const w=sortedW(); const cut=L.ymd(L.addDays(new Date(),-90)); const pts=w.filter(x=>x.d>=cut).map(x=>({x:L.parseYmd(x.d).getTime(),y:x.kg}));
  let h='<div class="card"><h3>Weigh-ins</h3><p class="small muted" style="margin:4px 0 8px">Weigh most mornings, same conditions. The weekly average matters, not a single day.</p>'+chart(pts,{label:'Body weight over time'});
  h+=[...w].reverse().slice(0,8).map(x=>'<div class="li"><span>'+fdate(x.d)+'</span><span class="num">'+fk(x.kg)+' kg <button class="btn sm ghost" data-act="fwdel" data-d="'+x.d+'" aria-label="Delete weigh-in '+x.d+'">Delete</button></span></div>').join('');
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
  const f=S.profile.fuel; const w=latestW();
  const sel=(k,opts)=>'<select data-in="fuel" data-k="'+k+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(String(f[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  let h='<div class="card"><h2>About you</h2><div class="stack" style="margin-top:10px">';
  h+='<div><span class="lbl">Goal</span><div class="chips">'+[['cut','Lose fat'],['recomp','Recomp'],['gain','Build muscle']].map(x=>'<button class="chip" data-act="fgoal" data-v="'+x[0]+'" aria-pressed="'+(f.goal===x[0])+'">'+x[1]+'</button>').join('')+'</div></div>';
  h+='<div><span class="lbl">Sex (for the base rate formula)</span><div class="chips"><button class="chip" data-act="fsex" data-v="m" aria-pressed="'+(f.sex!=='f')+'">Male</button><button class="chip" data-act="fsex" data-v="f" aria-pressed="'+(f.sex==='f')+'">Female</button></div></div>';
  h+='<div class="grid2"><div><label class="lbl" for="fa">Age</label><input id="fa" type="number" inputmode="numeric" data-in="fuel" data-k="age" value="'+esc(f.age)+'" placeholder="years"></div><div><label class="lbl" for="fh">Height (cm)</label><input id="fh" type="number" inputmode="decimal" data-in="fuel" data-k="h" value="'+esc(f.h)+'"></div>';
  h+='<div><label class="lbl" for="fw">Body weight (kg)</label><input id="fw" type="number" inputmode="decimal" step="0.1" data-in="fuelw" value="'+esc(w||'')+'" placeholder="today"></div><div><label class="lbl" for="fb">Body fat % (optional)</label><input id="fb" type="number" inputmode="decimal" data-in="fuel" data-k="bf" value="'+esc(f.bf)+'"></div></div>';
  h+='<div><label class="lbl" for="fl">Lean mass in kg (optional, overrides body fat %)</label><input id="fl" type="number" inputmode="decimal" data-in="fuel" data-k="lean" value="'+esc(f.lean)+'" placeholder="e.g. from a DEXA or smart scale"></div>';
  h+='<div><label class="lbl" for="fx">Activity</label>'+sel('act',[[1.4,'Mostly seated, lifting 3 to 4 times a week'],[1.55,'Moderately active day, lifting 4 times a week'],[1.7,'On your feet most of the day, plus lifting']]).replace('<select','<select id="fx"')+'</div>';
  h+='<div class="grid2"><div><label class="lbl" for="fr">Fat loss rate (per week)</label>'+sel('rate',[[0.25,'0.25% of body weight'],[0.5,'0.5% (default)'],[0.75,'0.75%']]).replace('<select','<select id="fr"')+'</div><div><label class="lbl" for="fm">Meals a day</label>'+sel('meals',[[3,'3'],[4,'4'],[5,'5'],[6,'6']]).replace('<select','<select id="fm"')+'</div></div>';
  h+='<div><label class="lbl" for="ft">Fat (grams per kg body weight)</label>'+sel('fat',[[0.6,'0.6 (lower fat, more carbs)'],[0.8,'0.8 (default)'],[1,'1.0 (higher fat)']]).replace('<select','<select id="ft"')+'</div></div>';
  h+='<p class="tiny muted" style="margin-top:8px">The rate only applies when losing fat.</p></div>';
  h+='<div id="fuelout">'+fuelOut()+'</div>'+checkinView()+weightView()+foodView();
  h+='<div class="card"><details><summary>How this is worked out</summary><div class="small stack" style="margin-top:8px">'+
  '<p><b>Base rate.</b> Mifflin-St Jeor from age, height, weight and sex. If you give lean mass or body fat %, the Katch-McArdle formula (370 + 21.6 × lean kg) is used instead. Either is multiplied by your activity level to estimate maintenance. Formulas are estimates, so the weekly check-in matters more than the first number.</p>'+
  '<p><b>Calories.</b> Fat loss: maintenance minus (rate × body weight × 7700 kcal ÷ 7 days). Recomp: 10% under maintenance. Build muscle: 7% over. There is a floor at your base rate or 1500 kcal (1200 for women), whichever is higher.</p>'+
  '<p><b>Protein.</b> Building: 2.0 g per kg body weight (range 1.6 to 2.2), from the Morton 2018 meta-analysis. Cutting or recomp: 2.4 g per kg of lean mass (range 2.3 to 2.5) if lean mass is known, otherwise 2.2 g per kg body weight (2.0 to 2.4). Higher protein in a deficit is supported by Longland 2016, Mettler 2010 and Helms 2014.</p>'+
  '<p><b>Fat and carbs.</b> Fat is set at 0.8 g per kg by default. Carbs are what is left. Carbs fuel training, so they take the remaining calories.</p>'+
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
