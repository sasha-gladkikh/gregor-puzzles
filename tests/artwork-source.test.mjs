import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allRounds} from '../game/rounds.mjs';
import {artworkSource,artworkSrcset} from '../game/artwork-source.mjs';

const manifest=JSON.parse(await readFile(new URL('../docs/artwork-resolution.json',import.meta.url),'utf8'));
const gameRoot=new URL('../game/',import.meta.url);

function losslessDimensions(bytes,label){
  assert.equal(bytes.toString('ascii',0,4),'RIFF',label);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',label);
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length,`${label}: complete RIFF payload`);
  let dimensions=null;
  for(let offset=12;offset+8<=bytes.length;){
    const type=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),start=offset+8;
    assert.ok(start+length<=bytes.length,`${label}: truncated ${type} chunk`);
    assert.notEqual(type,'VP8 ',`${label}: native artwork must retain lossless encoding`);
    if(type==='VP8L'){
      assert.ok(length>=5,`${label}: lossless header is present`);assert.equal(bytes[start],0x2f,`${label}: VP8L signature`);
      const header=bytes.readUInt32LE(start+1);
      assert.equal(header>>>29,0,`${label}: supported VP8L version`);
      dimensions={width:(header&0x3fff)+1,height:((header>>>14)&0x3fff)+1};
    }
    offset=start+length+(length&1);
  }
  assert.ok(dimensions,`${label}: lossless image chunk is present`);return dimensions;
}

test('all ten native assets are lossless WebP files with the dimensions and sizes recorded in the manifest',async()=>{
  assert.deepEqual(manifest.images.map(image=>image.round).sort(),allRounds.map(round=>round.number).sort());
  const paths=new Set();
  for(const round of allRounds){
    const source=artworkSource(round),entry=manifest.images.find(image=>image.round===round.number);
    assert.notEqual(source,round.artwork,`${round.number}: a native master is mapped`);assert.ok(!paths.has(source),`${round.number}: unique native source`);paths.add(source);
    const bytes=await readFile(new URL(source,gameRoot)),dimensions=losslessDimensions(bytes,round.number);
    assert.deepEqual(dimensions,{width:entry.width,height:entry.height},`${round.number}: dimensions match source manifest`);
    assert.equal(bytes.length,entry.bytes,`${round.number}: encoded size matches manifest`);
    assert.ok(dimensions.width>1200&&dimensions.height>900,`${round.number}: native detail exceeds the light rendition`);
  }
  assert.equal(paths.size,10);
});

test('responsive source widths match the actual encoded assets, including the 1447-pixel fifth round',async()=>{
  for(const round of allRounds){
    const candidates=artworkSrcset(round).split(',').map(candidate=>candidate.trim().split(/\s+/));
    assert.equal(candidates.length,2);assert.deepEqual(candidates[0],[round.artwork,'1200w']);
    const [native,width]=candidates[1];assert.equal(native,artworkSource(round));
    const dimensions=losslessDimensions(await readFile(new URL(native,gameRoot)),round.number);
    assert.equal(width,`${dimensions.width}w`);
    if(round.number==='05')assert.equal(width,'1447w');
  }
});

test('an unmapped round retains its original illustration without inventing a native candidate',()=>{
  const round={number:'99',artwork:'./artwork/future-round.webp'};
  assert.equal(artworkSource(round),round.artwork);assert.equal(artworkSrcset(round),'');
});
