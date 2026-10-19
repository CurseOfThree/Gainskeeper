window.GK_NATIVE=()=>!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
window.GK_PLUGIN=n=>{ const c=window.Capacitor; return (c.Plugins&&c.Plugins[n])||c.registerPlugin(n); };
// On-device text recognition (Google ML Kit), Android only. Takes an image Blob, returns text with rows rebuilt from line positions.
window.GK_OCR={
  available:()=>window.GK_NATIVE(),
  async image(blob){
    const FS=GK_PLUGIN('Filesystem'), TR=GK_PLUGIN('TextRecognition');
    const bmp=await createImageBitmap(blob); const k=Math.min(1,2400/Math.max(bmp.width,bmp.height));
    const cv=document.createElement('canvas'); cv.width=Math.round(bmp.width*k); cv.height=Math.round(bmp.height*k); cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
    const jpg=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.92));
    const b64=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(',')[1]); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(jpg); });
    const name='ocr-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'.jpg';
    const w=await FS.writeFile({path:name,data:b64,directory:'CACHE'});
    try{
      const r=await TR.processImage({path:w.uri});
      const items=[]; (r.blocks||[]).forEach(b=>(b.lines||[]).forEach(l=>(l.elements||[]).forEach(e=>{ if(e.boundingBox&&e.text&&e.text.trim()){ const bb=e.boundingBox; items.push({p:1,x:bb.left,w:bb.right-bb.left,y:(bb.top+bb.bottom)/2,h:bb.bottom-bb.top,t:e.text.trim()}); } })));
      const lines=[]; (r.blocks||[]).forEach(b=>(b.lines||[]).forEach(l=>{ if(l.boundingBox&&l.text&&l.text.trim()) lines.push({t:l.text.trim(),l:l.boundingBox.left,c:(l.boundingBox.top+l.boundingBox.bottom)/2,h:l.boundingBox.bottom-l.boundingBox.top}); }));
      if(!lines.length) return {text:(r.text||'').trim(),items};
      lines.sort((a,b)=>a.c-b.c); const rows=[]; lines.forEach(l=>{ const last=rows[rows.length-1]; if(last&&Math.abs(l.c-last.c)<Math.max(l.h,last.h||0)*0.6){ last.items.push(l); last.c=(last.c*(last.items.length-1)+l.c)/last.items.length; } else rows.push({c:l.c,h:l.h,items:[l]}); });
      return {text:rows.map(r=>r.items.sort((a,b)=>a.l-b.l).map(i=>i.t).join('  ')).join('\n'),items};
    } finally { try{ await FS.deleteFile({path:name,directory:'CACHE'}); }catch(e){} }
  }
};
// Platform shim: file saving on Android (Capacitor) and in a plain browser.
window.GK_DOWNLOADS={
  async save({filename,data}){
    const text=typeof data==='string'?data:JSON.stringify(data);
    const cap=window.Capacitor;
    if(cap&&cap.isNativePlatform&&cap.isNativePlatform()){
      const FS=GK_PLUGIN('Filesystem'), Share=GK_PLUGIN('Share');
      const w=await FS.writeFile({path:filename,data:text,directory:'CACHE',encoding:'utf8'});
      await Share.share({title:filename,url:w.uri,dialogTitle:'Save or send '+filename});
      return;
    }
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
    a.download=filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000);
  }
};
// Rest timer notification: fires even when the phone is locked or the app is in the background.
window.GK_REST={
  ready:false, last:0,
  async init(){ if(this.ready||!GK_NATIVE()) return this.ready; const LN=GK_PLUGIN('LocalNotifications');
    try{ let p=await LN.checkPermissions(); if(p.display!=='granted') p=await LN.requestPermissions(); if(p.display!=='granted') return false;
      await LN.createChannel({id:'rest',name:'Rest timer',description:'Tells you when rest between sets is over',importance:5,visibility:1,vibration:true}); this.ready=true; }catch(e){ console.warn('rest notify',e); }
    return this.ready; },
  async sync(end,body){ if(!GK_NATIVE()) return; if(end===this.last) return; this.last=end; const LN=GK_PLUGIN('LocalNotifications');
    try{ await LN.cancel({notifications:[{id:7001}]}); }catch(e){}
    if(!end||end<=Date.now()+1000) return; if(!(await this.init())) return;
    try{ await LN.schedule({notifications:[{id:7001,title:'Rest over',body:body||'Time for your next set.',channelId:'rest',autoCancel:true,schedule:{at:new Date(end),allowWhileIdle:true}}]}); }catch(e){ console.warn('rest schedule',e); } }
};
// Keep the screen on during a workout (optional setting).
window.GK_AWAKE={ on:false, async set(v){ v=!!v; if(v===this.on) return; this.on=v;
  try{ if(GK_NATIVE()){ const K=GK_PLUGIN('KeepAwake'); await (v?K.keepAwake():K.allowSleep()); }
       else if(navigator.wakeLock){ if(v) this.lock=await navigator.wakeLock.request('screen'); else if(this.lock){ await this.lock.release(); this.lock=null; } } }catch(e){} } };
// Automatic backups into Documents/Gainskeeper on the phone. Keeps the newest 8.
window.GK_BACKUP={
  available:()=>GK_NATIVE(),
  async write(name,text){ const FS=GK_PLUGIN('Filesystem');
    try{ const p=await FS.checkPermissions(); if(p.publicStorage&&p.publicStorage!=='granted') await FS.requestPermissions(); }catch(e){}
    await FS.writeFile({path:'Gainskeeper/'+name,data:text,directory:'DOCUMENTS',encoding:'utf8',recursive:true});
    try{ const r=await FS.readdir({path:'Gainskeeper',directory:'DOCUMENTS'}); const names=(r.files||[]).map(f=>typeof f==='string'?f:f.name).filter(n=>/^gainskeeper-auto-.*\.json$/.test(n)).sort();
      for(const n of names.slice(0,Math.max(0,names.length-8))){ try{ await FS.deleteFile({path:'Gainskeeper/'+n,directory:'DOCUMENTS'}); }catch(e){} } }catch(e){}
    return 'Documents/Gainskeeper/'+name; }
};
