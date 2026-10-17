import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {landmarkPiece} from '../game/engine.mjs';
import {cluePreview,latestPlayClue} from '../game/play-learning.mjs';

test('a mobile clue remains readable between milestones and after restoring placements',()=>{
  const round=allRounds.find(r=>r.gene==='CLCN1');
  const notePieces=round.illustration.landmarks.map(landmarkPiece);
  const ordinary=Array.from({length:12},(_,i)=>i).filter(i=>!notePieces.includes(i));
  const placed=ordinary.slice(0,2);
  const location=latestPlayClue(round,placed);
  assert.equal(location.title,round.clues[0].title);
  placed.push(ordinary[2]);
  assert.deepEqual(latestPlayClue(round,placed),location);
  assert.deepEqual(latestPlayClue(round,JSON.parse(JSON.stringify(placed))),location);
});

test('a newly found structure can replace the preview, while simultaneous milestones take priority',()=>{
  const round=allRounds.find(r=>r.gene==='CLCN1');
  const piece=landmarkPiece(round.illustration.landmarks[0]);
  const ordinary=Array.from({length:12},(_,i)=>i).filter(i=>!round.illustration.landmarks.map(landmarkPiece).includes(i));
  const placed=[...ordinary.slice(0,2),piece];
  assert.equal(latestPlayClue(round,placed).title,round.illustration.landmarks[0].playTitle);
  placed.push(ordinary[2]);
  assert.equal(latestPlayClue(round,placed).title,round.clues[1].title);
});

test('short previews retain a complete sentence without cutting scientific terms or replacing full clue text',()=>{
  const item={title:'Channel',text:'ClC-1 is a chloride channel. Each subunit has a pore.'};
  assert.deepEqual(cluePreview(item),{title:'Channel',text:'ClC-1 is a chloride channel.'});
  assert.equal(item.text,'ClC-1 is a chloride channel. Each subunit has a pore.');
  for(const round of allRounds){
    assert.equal(latestPlayClue(round,[]),null);
    for(let offset=0;offset<12;offset++){
      const order=Array.from({length:12},(_,i)=>(i+offset)%12);
      for(let n=2;n<11;n++){
        const preview=latestPlayClue(round,order.slice(0,n));
        assert.ok(preview?.title&&preview.text,`${round.gene}: ${n} pieces`);
        assert.ok(!`${preview.title} ${preview.text}`.includes(round.condition),round.gene);
      }
    }
  }
});
