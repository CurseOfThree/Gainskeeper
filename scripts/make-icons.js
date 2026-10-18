// One-off asset generator (needs playwright). Run: node scripts/make-icons.js
// Writes resources/*.svg and resources/android/res/** PNGs. CI does not run this.
const fs=require('fs'),path=require('path');
const B='#7c9eff',Y='#f2b705',W='#e8ebee',D='#0f1215';
const side=d=>{const rx=(x,w)=>d>0?x:x-w; const x0=60+d*30;
  return `<rect x="${rx(x0,14)}" y="21" width="14" height="78" rx="3" fill="${B}"/><rect x="${rx(x0+d*16,10)}" y="34" width="10" height="52" rx="3" fill="${B}"/><rect x="${rx(x0+d*28,5)}" y="49" width="5" height="22" rx="2" fill="${Y}"/>`;};
const bb=(scale,bar=W)=>`<g transform="translate(60 60) scale(${scale}) translate(-60 -60) rotate(-35 60 60)"><rect x="6" y="57" width="108" height="6" rx="3" fill="${bar}"/>${side(-1)}${side(1)}</g>`;
const svg=(inner,bg)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${bg||''}${inner}</svg>`;
const out=path.join(__dirname,'..','resources'); fs.mkdirSync(out,{recursive:true});
const files={
 'icon-foreground.svg':svg(bb(.54)),
 'icon-full.svg':svg(bb(.78),`<rect width="120" height="120" rx="26" fill="${D}"/>`),
 'icon-round.svg':svg(bb(.62),`<circle cx="60" cy="60" r="60" fill="${D}"/>`),
 'icon-store.svg':svg(bb(.78),`<rect width="120" height="120" fill="${D}"/>`),
};
for(const k in files) fs.writeFileSync(path.join(out,k),files[k]);
(async()=>{
 const {chromium}=require('playwright'); const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
 const png=async(name,file,px,dest)=>{ const p=await b.newPage({viewport:{width:px,height:px}}); await p.setContent(`<body style="margin:0;background:transparent">${files[file].replace('width="120" height="120"',`width="${px}" height="${px}"`)}</body>`); fs.mkdirSync(path.dirname(dest),{recursive:true}); await p.screenshot({path:dest,omitBackground:true}); await p.close(); };
 const res=path.join(out,'android','res');
 const legacy={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192}, fg={mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432};
 for(const d in legacy){ await png('l','icon-full.svg',legacy[d],`${res}/mipmap-${d}/ic_launcher.png`); await png('r','icon-round.svg',legacy[d],`${res}/mipmap-${d}/ic_launcher_round.png`); await png('f','icon-foreground.svg',fg[d],`${res}/mipmap-${d}/ic_launcher_foreground.png`); }
 await png('s','icon-store.svg',512,path.join(out,'icon-512.png'));
 fs.mkdirSync(`${res}/values`,{recursive:true}); fs.mkdirSync(`${res}/mipmap-anydpi-v26`,{recursive:true});
 fs.writeFileSync(`${res}/values/ic_launcher_background.xml`,`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${D}</color>\n</resources>\n`);
 const ad=`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
 fs.writeFileSync(`${res}/mipmap-anydpi-v26/ic_launcher.xml`,ad); fs.writeFileSync(`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`,ad);
 await b.close(); console.log('done');
})();
// splash: run separately with SPLASH=1
if(process.env.SPLASH){ (async()=>{ const {chromium}=require('playwright'); const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch()); const p=await b.newPage({viewport:{width:1024,height:1024}}); await p.setContent(`<body style="margin:0;background:${D}">${files['icon-foreground.svg'].replace('width="120" height="120"','width="520" height="520" style="position:absolute;left:252px;top:252px"')}</body>`); await p.screenshot({path:path.join(out,'splash.png')}); await b.close(); })(); }
