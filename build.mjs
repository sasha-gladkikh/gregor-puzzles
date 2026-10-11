import {mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['index.html','style.css','app.mjs','engine.mjs','session.mjs','round.mjs','rounds.mjs','collection.mjs','review.html','review.mjs','review.css','clinical.mjs','clinical-ui.mjs','clinical.css','hpo-terms.mjs'];
const contents=await Promise.all(files.map(file=>readFile(file,'utf8')));
const revision=createHash('sha256').update(contents.join('\n')).digest('hex').slice(0,12);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
// All local module imports share one content-derived revision, preventing mixed cached releases.
for(const [i,file]of files.entries()){
 const text=contents[i].replace(/(['"])(\.\/[^'"?]+\.(?:mjs|css))(?:\?[^'"]*)?\1/g,(_,quote,path)=>`${quote}${path}?v=${revision}${quote}`);
 await writeFile(`dist/${file}`,text);
}
await cp('artwork','dist/artwork',{recursive:true});
console.log(`Built 10-round static game and editorial review in dist/ (${revision})`);
