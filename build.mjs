import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const file of ['index.html','style.css','app.mjs','engine.mjs','session.mjs','round.mjs','rounds.mjs','collection.mjs','review.html','review.mjs','review.css']) await copyFile(file,`dist/${file}`);
await cp('artwork','dist/artwork',{recursive:true});
console.log('Built 10-round static game and content review in dist/');
