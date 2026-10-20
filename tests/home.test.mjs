import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyPlayURL,nextHomeRound} from '../game/home-state.mjs';
test('home keeps old direct round links, search options, and fragment intact',()=>{
 assert.equal(legacyPlayURL(''),null);assert.equal(legacyPlayURL('?utm_source=poster','#leaderboard'),null);
 assert.equal(legacyPlayURL('?level=08&mode=timed','#figure'),'./play.html?level=08&mode=timed#figure');
 assert.equal(legacyPlayURL('?level=a'),'./play.html?level=a');
 assert.equal(legacyPlayURL('?level=https://other.example'),'./play.html?level=https://other.example');
});
test('home resumes unfinished work before an untouched round without resetting progress',()=>{
 const progress=[{round:{number:'01'},done:true,pieces:12},{round:{number:'02'},done:false,pieces:0},{round:{number:'03'},done:false,pieces:4}];
 const before=structuredClone(progress);assert.equal(nextHomeRound(progress).round.number,'03');assert.deepEqual(progress,before);
 progress[2].done=true;assert.equal(nextHomeRound(progress).round.number,'02');progress[1].done=true;assert.equal(nextHomeRound(progress).round.number,'01');
});

test('home destination distinguishes new, interrupted, next and completed visits',async()=>{
 const {homeDestination}=await import('../game/home-state.mjs');
 const items=[{round:{number:'01',topic:'Membrane transport'},done:false,pieces:0},{round:{number:'06',topic:'Synaptic communication'},done:false,pieces:0}];
 assert.equal(homeDestination(items).label,'Start a puzzle');
 items[1].pieces=4;
 assert.deepEqual(homeDestination(items),{href:'./play.html?level=06',label:'Continue round 06',detail:'Synaptic communication · 4 of 12 pieces placed.'});
 items[1].done=true;items[1].pieces=12;
 assert.equal(homeDestination(items).label,'Play your next puzzle');
 items[0].done=true;items[0].pieces=12;
 assert.equal(homeDestination(items).href,'./collection.html');
});

test('built home exposes only playable rounds before JavaScript runs',async()=>{
 const {prepareHomeHTML}=await import('../scripts/homepage.mjs');
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../game/index.html',import.meta.url),'utf8');
 const one=prepareHomeHTML(html,[{number:'06'}]);
 assert.match(one,/id="siteHeader" data-prerendered="true"/);
 assert.match(one,/id="homePlay"[^>]*level=06/);
 assert.match(one,/id="roundCount">1<\/span>/);
 assert.doesNotMatch(one,/class="hero-figure"/);
 assert.doesNotMatch(one,/class="featured-card"/);
 const playLinks=[...one.matchAll(/\.\/play\.html\?level=(\d{2})/g)].map(m=>m[1]);
 assert.ok(playLinks.length>0);assert.ok(playLinks.every(number=>number==='06'));
 const two=prepareHomeHTML(html,[{number:'01'},{number:'05'}]);
 assert.match(two,/class="hero-figure"/);
 assert.doesNotMatch(two,/class="featured-card"/);
 assert.throws(()=>prepareHomeHTML(html,[]),/playable/);
});
