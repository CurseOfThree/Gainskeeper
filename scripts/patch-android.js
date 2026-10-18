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
// versionCode from CI run number so each build installs over the last
const code=process.env.GITHUB_RUN_NUMBER||'1';
g=fs.readFileSync(f,'utf8').replace(/versionCode \d+/,'versionCode '+code).replace(/versionName "[^"]*"/,'versionName "1.0.'+code+'"');
fs.writeFileSync(f,g);
console.log('patched',f,'versionCode',code);
