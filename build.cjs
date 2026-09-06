// 配布ファイルを静的ホスティング用にコピーするだけです。通常の閲覧には不要。
const fs=require('fs');
const path=require('path');
require('./update-assets.cjs');
const names=['index.html','style.css','script.js','world.js','assets','vendor'];
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
for(const name of names)fs.cpSync(path.join(__dirname,name),path.join(__dirname,'dist',name),{recursive:true});
console.log('Static output ready.');
