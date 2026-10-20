import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoundCarousel} from '../game/round-carousel.mjs';

function setup(){
  const document={};
  class Element{
    constructor(tag){this.tag=tag;this.ownerDocument=document;this.children=[];this.attributes=new Map();this.dataset={};this.properties=new Map();this.style={setProperty:(key,value)=>this.properties.set(key,value)};this.scrollLeft=0;this.scrollWidth=300;this.clientWidth=300;this.rect={left:20,right:320,width:300};}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this.attributes.set(name,value);}
    getBoundingClientRect(){return this.rect;}
  }
  document.createElement=tag=>new Element(tag);
  const list=new Element('ol');
  const catalogue=[{number:'02',topic:'Cell communication'},{number:'05',topic:'RNA splicing'},{number:'08',topic:'Minor RNA splicing'}];
  return {list,catalogue,document};
}

test('Home and Play expose only supplied rounds, without leaking identities in thumbnail labels',()=>{
  const {list,catalogue}=setup();
  createRoundCarousel(list,catalogue,{currentRound:'05',assetQuery:'?v=test'});
  assert.equal(list.children.length,3);
  assert.equal(list.properties.get('--round-count'),'3');
  const links=list.children.map(item=>item.children[0]);
  assert.deepEqual(links.map(link=>link.href),['./play.html?level=02','./play.html?level=05','./play.html?level=08']);
  assert.equal(links[1].attributes.get('aria-current'),'page');
  assert.equal(links[0].attributes.has('aria-current'),false);
  assert.equal(links[1].attributes.get('aria-label'),'Round 05: RNA splicing. Not started. Current round.');
  assert.equal(links[1].children[0].src,'./artwork/05.webp?v=test');
  assert.equal(links[1].children[0].alt,'');
});

test('completion and reset update badges in place, preserving focus and browsing position',()=>{
  const {list,catalogue,document}=setup();
  const carousel=createRoundCarousel(list,catalogue,{currentRound:'05'});
  const links=list.children.map(item=>item.children[0]),second=links[1];
  document.activeElement=second;list.scrollLeft=74;
  carousel.update([{round:catalogue[0],done:false,pieces:3},{round:catalogue[1],done:true,pieces:12}]);
  assert.equal(links[0].dataset.state,'started');
  assert.equal(links[0].children[2].properties.get('--piece-progress'),'25%');
  assert.equal(second.dataset.state,'complete');assert.equal(second.children[1].textContent,'✓');
  assert.match(second.attributes.get('aria-label'),/Complete\. Current round/);
  assert.equal(document.activeElement,second);assert.equal(list.scrollLeft,74);
  assert.deepEqual(list.children.map(item=>item.children[0]),links);
  carousel.update(catalogue.map(round=>({round,done:false,pieces:0})));
  assert.equal(second.dataset.state,'new');assert.equal(second.children[1].textContent,'05');
  assert.equal(second.attributes.get('aria-current'),'page');
  assert.equal(second.children[2].properties.get('--piece-progress'),'0%');
  assert.equal(document.activeElement,second);
});

test('the active round is revealed only within its carousel, without scrolling the document',()=>{
  const {list,catalogue}=setup();
  const carousel=createRoundCarousel(list,catalogue,{currentRound:'08'});
  const current=list.children[2].children[0];
  list.scrollWidth=900;current.rect={left:700,right:772,width:72};
  carousel.revealCurrent();
  assert.equal(list.scrollLeft,566);
  current.rect={left:134,right:206,width:72};
  carousel.revealCurrent();assert.equal(list.scrollLeft,566,'An already visible round does not recenter on every update');
  list.clientWidth=900;
  current.rect={left:700,right:772,width:72};
  carousel.revealCurrent();assert.equal(list.scrollLeft,566);
});

test('journey navigation can preserve its route without exposing unapproved rounds',()=>{
  const {list,catalogue}=setup();
  const carousel=createRoundCarousel(list,[catalogue[1]],{href:round=>`./play.html?level=${round.number}&journey=rna`});
  assert.equal(list.children[0].children[0].href,'./play.html?level=05&journey=rna');
  carousel.update([{round:catalogue[0],done:true,pieces:12}]);
  assert.equal(list.children.length,1);
});
