import test from 'node:test';
import assert from 'node:assert/strict';
import {SHARE_PLAY_URL,SHARE_CARD_WIDTH,shareCardData,wrapShareText,containShareImage} from '../game/share-card.mjs';

const completed={round:{number:'02',gene:'GJB2',condition:'Autosomal recessive nonsyndromic hearing loss 1A',topic:'Cell communication',artwork:'./artwork/02.webp?v=123'},completed:3,total:10};

test('share images contain completed-round biology and progress without personal data',()=>{
 const data=shareCardData({...completed,displayName:'Private Player',seconds:55,round:{...completed.round,patientName:'Hidden'}});
 assert.deepEqual(data,{number:'02',gene:'GJB2',condition:completed.round.condition,topic:'Cell communication',artwork:'./artwork/02.webp?v=123',completed:3,total:10,url:SHARE_PLAY_URL,filename:'gregor-puzzles-round-02.png'});
 assert.equal(SHARE_PLAY_URL,'https://sasha-gladkikh.github.io/gregor-puzzles/');
 assert.ok(SHARE_CARD_WIDTH>=1440);
});

test('incomplete or invalid progress cannot produce a completion card',()=>{
 for(const data of [null,{}, {...completed,completed:0},{...completed,completed:11},{...completed,total:0},{...completed,total:3.5},{...completed,round:{...completed.round,number:'100'}},{...completed,round:{...completed.round,gene:''}},{...completed,round:{...completed.round,artwork:''}}])assert.equal(shareCardData(data),null);
 assert.equal(shareCardData({...completed,completed:1,total:1,round:{...completed.round,number:'06'}}).number,'06');
});

test('long condition names wrap without truncation or splitting ordinary words',()=>{
 const text='Autosomal recessive nonsyndromic hearing loss 1A';
 const lines=wrapShareText(text,24,value=>value.length);
 assert.equal(lines.join(' '),text);
 assert.ok(lines.every(line=>line.length<=24));
 assert.deepEqual(wrapShareText('  RNA  splicing\npathway ',14,value=>value.length),['RNA splicing','pathway']);
 assert.deepEqual(wrapShareText('',10,value=>value.length),[]);
 assert.throws(()=>wrapShareText('x',0,value=>value.length),/positive/);
});

test('unspaced text wraps at code points without losing content',()=>{
 const value='Genetics🧬Sequence';
 const lines=wrapShareText(value,5,text=>[...text].length);
 assert.equal(lines.join(''),value);assert.ok(lines.every(line=>[...line].length<=5));
});

test('full illustrations are contained in the card without cropping or distortion',()=>{
 assert.deepEqual(containShareImage(1200,900,80,208,1440,1080),{x:80,y:208,width:1440,height:1080});
 assert.deepEqual(containShareImage(1000,1000,80,208,1440,1080),{x:260,y:208,width:1080,height:1080});
 assert.throws(()=>containShareImage(0,900,80,208,1440,1080),/positive/);
});
