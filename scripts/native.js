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
      const lines=[]; (r.blocks||[]).forEach(b=>(b.lines||[]).forEach(l=>{ if(l.boundingBox&&l.text&&l.text.trim()) lines.push({t:l.text.trim(),l:l.boundingBox.left,c:(l.boundingBox.top+l.boundingBox.bottom)/2,h:l.boundingBox.bottom-l.boundingBox.top}); }));
      if(!lines.length) return (r.text||'').trim();
      lines.sort((a,b)=>a.c-b.c); const rows=[]; lines.forEach(l=>{ const last=rows[rows.length-1]; if(last&&Math.abs(l.c-last.c)<Math.max(l.h,last.h||0)*0.6){ last.items.push(l); last.c=(last.c*(last.items.length-1)+l.c)/last.items.length; } else rows.push({c:l.c,h:l.h,items:[l]}); });
      return rows.map(r=>r.items.sort((a,b)=>a.l-b.l).map(i=>i.t).join('  ')).join('\n');
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
