// Grid reader regression: P9 PDF text positions -> 12 weeks x 4 days, 354 entries, 1RMs carried per block.
const fs=require('fs'),assert=require('assert');
eval(fs.readFileSync(__dirname+'/../src/logic.js','utf8')+';globalThis.L=LOGIC;');
const g=L.parseGrid(JSON.parse(fs.readFileSync(__dirname+'/p9items.json','utf8')));
assert.strictEqual(g.weeks,12); assert.strictEqual(g.days,4); assert.strictEqual(g.rows,354);
assert.deepStrictEqual(g.rmByWeek[7],{squat:137.5,bench:125,deadlift:170});
const r=L.parseCSV(g.csv); assert.strictEqual(r.prog.weeks.length,12);
console.log('grid ok');
