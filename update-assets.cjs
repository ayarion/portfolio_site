// モデルを交換したときに圧縮版を更新。base64は生成しません。
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const assets=path.join(__dirname,'assets');
fs.writeFileSync(path.join(assets,'hamster.glb.gz'),zlib.gzipSync(fs.readFileSync(path.join(assets,'hamster.glb')),{level:9}));
console.log('Compressed model ready. Screenshots stay as lazy-loaded image files.');
