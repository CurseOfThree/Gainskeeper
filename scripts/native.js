// Platform shim: file saving on Android (Capacitor) and in a plain browser.
window.GK_DOWNLOADS={
  async save({filename,data}){
    const text=typeof data==='string'?data:JSON.stringify(data);
    const cap=window.Capacitor;
    if(cap&&cap.isNativePlatform&&cap.isNativePlatform()){
      const FS=cap.Plugins.Filesystem, Share=cap.Plugins.Share;
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
