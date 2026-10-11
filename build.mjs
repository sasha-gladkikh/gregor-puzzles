import {mkdir,readFile,writeFile,cp,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['index.html','style.css','app.mjs','engine.mjs','session.mjs','round.mjs','rounds.mjs','collection.mjs','review.html','review.mjs','review.css','clinical.mjs','clinical-ui.mjs','clinical.css','hpo-terms.mjs','artwork-studies.mjs','artwork-study.html','artwork-study.css','artwork-data.mjs','artwork-ui.mjs','artwork.css'];
const contents=await Promise.all(files.map(file=>readFile(file,'utf8')));
const hash=createHash('sha256').update(contents.join('\n'));
async function hashArtwork(directory){
 for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const path=`${directory}/${entry.name}`;
  if(entry.isDirectory())await hashArtwork(path);
  else hash.update(path).update(await readFile(path));
 }
}
await hashArtwork('artwork');
const revision=hash.digest('hex').slice(0,12);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
// All local module imports share one content-derived revision, preventing mixed cached releases.
for(const [i,file]of files.entries()){
 const text=contents[i].replace(/(['"])(\.\/[^'"?]+\.(?:mjs|css|webp|png|svg))(?:\?[^'"]*)?\1/g,(_,quote,path)=>`${quote}${path}?v=${revision}${quote}`);
 await writeFile(`dist/${file}`,text);
}
await cp('artwork','dist/artwork',{recursive:true});
console.log(`Built 10-round static game and editorial review in dist/ (${revision})`);
