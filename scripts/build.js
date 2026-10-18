// Assembles src/ into www/index.html. Run: node scripts/build.js
const fs=require('fs'),path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
let shell=r('shell.html')
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/,'')
  .replace(/<link rel="preconnect"[^>]*>\n?/,'');
const head='<!doctype html>\n<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0f1215">\n';
const markup='\n<div id="app"></div>\n<div id="restbar" hidden></div>\n<div id="toast" class="notice" role="status" hidden></div>\n<nav class="tabbar" id="tabbar" aria-label="Sections" hidden></nav>\n';
const js=['logic.js','program.js','lib.js','ui1.js','ui2.js','ui3.js','ui4.js','ui5.js'].map(r).join('\n');
const native=fs.readFileSync(path.join(__dirname,'native.js'),'utf8');
const out=head+shell+markup+'<script>\n'+native+'\n'+js+'\n</script>\n</body></html>\n';
fs.mkdirSync(path.join(__dirname,'..','www'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'..','www','index.html'),out);
console.log('www/index.html',out.length,'bytes');
