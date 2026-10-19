// Collection views reuse the game's saved progress; they never write a new format.
const pairs=[
 {numbers:['05','08'],relationship:'Compare major and minor RNA splicing'},
 {numbers:['01','06'],relationship:'Compare ion-channel roles'},
 {numbers:['07','09'],relationship:'Compare signaling regulation'}
];

export function relatedRoundLinks(number,progress){
 return pairs.filter(pair=>pair.numbers.includes(number)).flatMap(pair=>pair.numbers.filter(n=>n!==number).flatMap(n=>{
  const item=progress.find(entry=>entry.round.number===n);
  if(!item)return [];
  const {round,done}=item;
  return [{number:n,title:done?round.gene:round.topic,href:`./play.html?level=${n}`,done,relationship:pair.relationship,...(done?{gene:round.gene,condition:round.condition}:{})}];
 }));
}
export const relatedCompletedRounds=(number,progress)=>relatedRoundLinks(number,progress).filter(item=>item.done);
export const completedGuideRounds=progress=>progress.filter(item=>item.done).map(item=>item.round);
export const splicingPairComplete=progress=>['05','08'].every(number=>progress.some(item=>item.round.number===number&&item.done));

// Keep the printable takeaways explicit: a selected technical pearl should not
// displace a condition's course, clinical significance, or family implications.
export function guideClinicalSections(round){
 const profile=round.clinical;
 return [
  {label:'Mechanism',text:profile.connection},
  {label:'Clinical pattern',text:profile.pattern},
  {label:'Onset and course',text:profile.onset},
  {label:'Clinical significance',text:profile.significance.text},
  {label:'Family implications',text:profile.family.text}
 ];
}

export function guideReferences(round){
 const profile=round.clinical;
 // The condition's OMIM link is already shown once in the guide header.
 const omim=`https://omim.org/entry/${round.omim}`;
 const urls=[...profile.connectionSources,profile.patternSource,...profile.significance.sources,...profile.family.sources,round.illustration.source,round.illustration.noteSource].filter(url=>url&&url!==omim);
 return [...new Set(urls)].map(url=>({url,label:round.sources.find(([,value])=>value===url)?.[0]??'Supporting reference'}));
}

// These groups organize the process illustrated in a round. They are not claims
// of exclusive localization, direct interaction, or clinical relatedness.
export const processGroups=[
 {id:'exchange',title:'Membranes & communication',description:'Channels and exchange between cells.',numbers:['01','02','06']},
 {id:'processing',title:'Cellular processing',description:'Transport and ribosome maturation.',numbers:['03','04']},
 {id:'rna',title:'RNA & DNA',description:'RNA splicing and an intronic repeat.',numbers:['05','08','10']},
 {id:'signaling',title:'Signal regulation',description:'Developmental and immune signaling.',numbers:['07','09']}
];
