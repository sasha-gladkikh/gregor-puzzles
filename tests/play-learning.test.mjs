import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {landmarkPiece} from '../game/engine.mjs';
import {cluePreview,latestPlayClue} from '../game/play-learning.mjs';
import {newState,place} from '../game/engine.mjs';
import {restoreSession} from '../game/session.mjs';

test('mechanism and variant clues appear at their milestones and survive older partial saves',()=>{
  for(const round of allRounds)for(const [count,label,key]of[[5,'Disease mechanism','mechanism'],[10,'Variant type','variantType']]){
    const state=newState();for(let i=0;i<count;i++)place(state,i,i);
    const restored=restoreSession(JSON.parse(JSON.stringify({state,timed:false}))).state;
    const unlocked=round.clues.filter(clue=>clue.at<=restored.placed.length);
    assert.equal(unlocked.at(-1).label,label);
    assert.ok(!unlocked.some(clue=>['The gene','The condition'].includes(clue.label)));
    const preview=latestPlayClue(round,restored.placed);
    assert.deepEqual(preview,{title:round.molecular[key].title,text:round.molecular[key].preview});
  }
});

test('short molecular previews preserve the scientific qualifications in the full clue',()=>{
  const fact=(gene,key='mechanism')=>allRounds.find(round=>round.gene===gene).molecular[key];
  for(const text of[fact('CACNA1A').body,fact('CACNA1A').preview])assert.match(text,/increase or decrease/);
  for(const text of[fact('RNU4-2').body,fact('RNU4-2').preview])assert.match(text,/under investigation/);
  for(const text of[fact('FGF14').body,fact('FGF14').preview])assert.match(text,/likely/);
  assert.match(fact('STING1','variantType').preview,/Disease-associated/);
  assert.match(fact('RNU4ATAC','variantType').preview,/RNA.*not an amino-acid/);
});

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

test('authored image previews take priority over extracting the first sentence',()=>{
  const round=allRounds[0],note=round.illustration.landmarks[0];
  const preview=latestPlayClue(round,[landmarkPiece(note)]);
  assert.equal(preview.text,note.playPreview);
  assert.deepEqual(cluePreview({title:'Transport',preview:'The transporter moves molecules.',text:'A longer explanation.'}),{title:'Transport',text:'The transporter moves molecules.'});
});

test('the visible preview key follows the same milestone priority and survives restoring progress',async()=>{
  const {latestClueKey}=await import('../game/play-learning.mjs');
  for(const round of allRounds){
    assert.equal(latestClueKey(round,[]),'');
    for(let offset=0;offset<12;offset++){
      const order=Array.from({length:12},(_,i)=>(i+offset)%12);
      for(let n=1;n<12;n++){
        const placed=order.slice(0,n),key=latestClueKey(round,placed),preview=latestPlayClue(round,placed);
        assert.equal(latestClueKey(round,JSON.parse(JSON.stringify(placed))),key);
        if(!key){assert.equal(preview,null);continue;}
        const [kind,value]=key.split(':');
        const expected=kind==='landmark'?round.illustration.landmarks[Number(value)].playTitle:round.clues.find(clue=>clue.at===Number(value)).title;
        assert.equal(preview.title,expected,`${round.gene} ${key}`);
      }
    }
  }
});
