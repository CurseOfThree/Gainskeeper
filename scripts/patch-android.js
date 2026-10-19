// Run after `cap add android`: adds release signing with the committed keystore.
const fs=require('fs');
const f='android/app/build.gradle'; let g=fs.readFileSync(f,'utf8');
if(!g.includes('signingConfigs')){
  g=g.replace(/android \{/,`android {
    signingConfigs {
        release {
            storeFile file('../../keystore/gainskeeper.jks')
            storePassword 'gainskeeper-keep'
            keyAlias 'gainskeeper'
            keyPassword 'gainskeeper-keep'
        }
    }`);
  g=g.replace(/release \{\n(\s+)minifyEnabled false/,`release {\n$1signingConfig signingConfigs.release\n$1minifyEnabled false`);
  fs.writeFileSync(f,g);
}
// manifest: exact alarms for the rest timer (auto-granted on Android 13+), storage for backups on Android 9 and older
const mf='android/app/src/main/AndroidManifest.xml'; let m=fs.readFileSync(mf,'utf8');
const perms=['<uses-permission android:name="android.permission.USE_EXACT_ALARM" />','<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />','<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="29" />'];
perms.forEach(x=>{ if(!m.includes(x.split('"')[1])) m=m.replace('</manifest>','    '+x+'\n</manifest>'); });
if(!m.includes('requestLegacyExternalStorage')) m=m.replace('<application','<application android:requestLegacyExternalStorage="true"');
fs.writeFileSync(mf,m);
// launcher icons and splash from resources/
const path=require('path');
const cp=(src,dst)=>{ for(const e of fs.readdirSync(src,{withFileTypes:true})){ const s=path.join(src,e.name),d=path.join(dst,e.name); if(e.isDirectory()){ fs.mkdirSync(d,{recursive:true}); cp(s,d); } else fs.copyFileSync(s,d); } };
const resDst='android/app/src/main/res';
if(fs.existsSync('resources/android/res')) cp('resources/android/res',resDst);
if(fs.existsSync('resources/splash.png')){ const walk=d=>{ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(e.name==='splash.png') fs.copyFileSync('resources/splash.png',p); } }; walk(resDst); }
// versionCode from CI run number so each build installs over the last
const code=process.env.GITHUB_RUN_NUMBER||'1';
g=fs.readFileSync(f,'utf8').replace(/versionCode \d+/,'versionCode '+code).replace(/versionName "[^"]*"/,'versionName "1.0.'+code+'"');
fs.writeFileSync(f,g);
console.log('patched',f,'versionCode',code);
