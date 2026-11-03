// Exercise groups, custom exercises, percentage loads.
const fs=require('fs'),assert=require('assert');
eval(fs.readFileSync(__dirname+'/../src/logic.js','utf8')+';globalThis.L=LOGIC;');
const g=L.exByGroup(); ['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Core'].forEach(k=>assert.ok(g[k].length>=10,k+' has '+g[k].length));
assert.strictEqual(L.parseLoad('75%','back squat').pct,75);
L.setCustomEx([{n:'Landmine Row',t:'hpull',q:'bb'}]); assert.ok(L.exByGroup().Back.some(e=>e.n==='Landmine Row'));
L.setCustomEx([]); assert.ok(!L.exByGroup().Back.some(e=>e.n==='Landmine Row'));
const p=L.generate({goal:'size',focus:'back',time:45,seed:3}); const r=L.replaceItem(p,0,'T-Bar Row'); assert.strictEqual(r.items[0].name,'T-Bar Row');
console.log('groups ok');
