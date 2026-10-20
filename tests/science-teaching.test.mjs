import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {hpoTerms} from '../game/hpo-terms.mjs';
import {roundReferences} from '../game/clinical-ui.mjs';
import {clinicalDetails,hasExactHpoTitle,groupedClinicalFeatures,scientificFamily,scientificInterpretation,scientificReferences,scientificCheckNote} from '../game/science-ui.mjs';
import {interpretationPrinciples} from '../game/interpretation.mjs';

// Small DOM adapter lets the content projections be exercised without a browser.
// Layout, interaction, and printing are checked separately in the browser.
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.className='';}
 set textContent(text){this.children=[String(text)];}
 get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
 append(...children){this.children.push(...children);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 addEventListener(){}
 get classList(){return {add:className=>{this.className+=` ${className}`;}};}
}
const walk=element=>[element,...element.children.filter(child=>child instanceof Element).flatMap(walk)];
const document={createElement:tag=>new Element(tag),createTextNode:text=>String(text)};

test('source dates distinguish baseline terminology, mechanism teaching, and selected clinical additions',()=>{
 const baseline={checked:'15 October 2026',molecular:{checked:'20 October 2026'},clinical:{}};
 assert.equal(scientificCheckNote(baseline),'Clinical profile and HPO terminology checked 15 October 2026. Mechanism and variant teaching checked 20 October 2026.');
 assert.equal(scientificCheckNote({...baseline,clinical:{updatesChecked:'21 October 2026'}}),'Clinical profile and HPO terminology checked 15 October 2026. Mechanism and variant teaching checked 20 October 2026. Selected clinical additions checked 21 October 2026.');
 assert.equal(scientificCheckNote({checked:'15 October 2026'}),'Clinical profile and HPO terminology checked 15 October 2026.');
});

test('clinical feature groups preserve every finding exactly once, with explicit teaching emphasis',()=>{
 for(const round of allRounds){
  const groups=groupedClinicalFeatures(round.clinical.features),findings=groups.flatMap(group=>group.items);
  assert.equal(findings.length,round.clinical.features.length,`${round.gene}: missing or repeated feature`);
  assert.equal(new Set(findings).size,findings.length);
  assert.ok(round.clinical.features.every(feature=>findings.includes(feature)));
  assert.ok(groups.every(group=>['characteristic','variable','course'].includes(group.id)));
 }
 const characteristic={system:'Growth',key:true},variable={system:'Neurologic'},course={system:'Course',key:true};
 assert.deepEqual(groupedClinicalFeatures([course,variable,characteristic]).map(group=>[group.id,...group.items]),[
  ['characteristic',characteristic],['variable',variable],['course',course]
 ]);
});

test('Science retains overview, clinical significance, family context, and qualified HPO terminology',()=>{
 const previous=globalThis.document;globalThis.document=document;
 try{
  for(const round of allRounds){
   const clinical=clinicalDetails(round),family=scientificFamily(round),interpretation=scientificInterpretation(round);
   for(const text of [round.clinical.overview,round.clinical.onset,round.clinical.significance.text])assert.ok(clinical.textContent.includes(text),`${round.gene}: clinical summary missing`);
   assert.ok(family.textContent.includes(round.clinical.family.text));
   assert.ok(interpretation.textContent.includes(round.clinical.interpretation.text));
   for(const feature of round.clinical.features){
    assert.ok(clinical.textContent.includes(feature.text),`${round.gene}: ${feature.title}`);
    if(feature.hpo){
     const term=walk(clinical).find(element=>element.href===`https://hpo.jax.org/browse/term/${feature.hpo}`);
     assert.ok(term,`${round.gene}: missing HPO link`);assert.ok(term.textContent.includes(hpoTerms[feature.hpo]));
     if(feature.hpoQualifier)assert.ok(clinical.textContent.includes(feature.hpoQualifier));
    }
   }
   for(const principle of interpretationPrinciples)assert.ok(interpretation.textContent.includes(principle.text));
   const references=scientificReferences(round),links=walk(references).filter(element=>element.tagName==='A');
   for(const reference of roundReferences(round))assert.equal(links.filter(link=>link.href===reference.url).length,1,`${round.gene}: external literature link repeated`);
   const targets=new Set(walk(references).map(element=>element.id).filter(Boolean));
   for(const element of [clinical,family,interpretation].flatMap(walk).filter(element=>element.href?.startsWith('#ref-')))assert.ok(targets.has(element.href.slice(1)),`${round.gene}: citation has no target`);
  }
 }finally{globalThis.document=previous;}
});


test('Exact HPO titles link once, while partial mappings retain their qualifier',()=>{
 assert.equal(hasExactHpoTitle({title:'Short stature',hpo:'HP:0004322'}),true);
 assert.equal(hasExactHpoTitle({title:'Learning or language difficulties',hpo:'HP:0000750'}),false);
 assert.equal(hasExactHpoTitle({title:'Short stature',hpo:'HP:0004322',hpoQualifier:'Broader mapping'}),false);
 const previous=globalThis.document;globalThis.document=document;
 try{
  const round=allRounds.find(round=>round.gene==='PTPN11'),clinical=clinicalDetails(round);
  const matches=walk(clinical).filter(element=>element.href==='https://hpo.jax.org/browse/term/HP:0004322');
  assert.equal(matches.length,1);assert.equal(matches[0].textContent,'Short stature ↗');
  assert.ok(clinical.textContent.includes('not all learning difficulties'));
 }finally{globalThis.document=previous;}
});
