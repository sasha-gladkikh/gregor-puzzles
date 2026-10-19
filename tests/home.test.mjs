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
