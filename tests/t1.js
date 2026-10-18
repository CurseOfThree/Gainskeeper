const fs=require('fs');
eval(fs.readFileSync(__dirname+'/../src/logic.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../src/program.js','utf8')+';globalThis.LOGIC=LOGIC;globalThis.P9=P9_DSL;');
const L=globalThis.LOGIC; const {prog,warn}=L.parseDSL(globalThis.P9);
console.log('weeks',prog.weeks.length,'days',prog.weeks.map(w=>w.days.length).join(''),'warn',warn);
console.log(JSON.stringify(prog.weeks[6].days[0].ex.slice(0,3)));
console.log(JSON.stringify(prog.weeks[0].days[0].ex[1]), JSON.stringify(prog.weeks[0].days[2].ex[2]));
console.log(prog.weeks[0].days[3].ex[1], prog.weeks[11].days[3].ex[6]);
for(const t of [15,30,45,60]) for(const g of Object.keys(L.GOALS)){ for(const f of ['full','legs','arms','core']){ const p=L.generate({goal:g,focus:f,time:t,seed:5}); if(p.min>t+0.5||p.items.length<2) console.log('BAD',t,g,f,p.min,p.items.length); } }
const p=L.generate({goal:'size',focus:'back',time:30,seed:3}); console.log(p.min,p.items.map(i=>i.name+' '+i.sets+'x'+i.lo+'-'+i.hi+(i.ss||'')).join(' | '));
const p2=L.generate({goal:'stamina',focus:'full',time:15,seed:3}); console.log(p2.min,p2.items.map(i=>i.name+' '+i.sets+'x'+i.lo+'-'+i.hi+(i.ss||'')).join(' | '));
console.log(L.nutrition({sex:'m',age:30,h:178,w:80,act:1.55,goal:'cut',rate:.5,meals:4,fat:.8}));
console.log(L.nutrition({sex:'m',age:30,h:178,w:80,bf:18,act:1.55,goal:'recomp',rate:.5,meals:4,fat:.8}));
console.log(L.progress([{kg:60,reps:10},{kg:60,reps:10}],6,10,2.5),L.progress([{kg:60,reps:8},{kg:60,reps:9}],6,10,2.5));
console.log(L.keyOf('PULL UPS (KEEP DROPPING)'),L.keyOf('Bench Press'),L.keyOf('BENCH'),L.keyOf('SQUAT'),L.keyOf('Back Squat'));
console.log(L.parseAny('week,day,exercise,sets,reps,load\n1,A,Squat,3,5,100kg\n1,A,Bench,3,"8-10",RPE8').prog.weeks[0].days[0].ex.map(e=>e.name+e.sets+e.repsText));
console.log(L.checkin([...Array(7)].map((_,i)=>({d:L.ymd(L.addDays(new Date(),-i)),kg:80})).concat([...Array(5)].map((_,i)=>({d:L.ymd(L.addDays(new Date(),-8-i)),kg:80.5}))),'cut',.5,new Date()));
