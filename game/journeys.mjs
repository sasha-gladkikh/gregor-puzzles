// Shared, answer-free routes. Resolve every step against the currently
// published catalogue rather than importing the full scientific dataset.
const definitions=[
 {id:'communication',title:'How cells communicate',question:'Follow a signal from one cell to the next.',numbers:['02','06','07']},
 {id:'rna',title:'From RNA to protein',question:'Explore the machinery behind a molecular message.',numbers:['05','08','04']},
 {id:'transport',title:'Across a membrane',question:'Discover what moves, where it goes, and why it matters.',numbers:['01','02','03']},
];

export function availableJourneys(catalogue){
 const lookup=new Map();
 for(const round of Array.isArray(catalogue)?catalogue:[]){
  if(round&&/^\d{2}$/.test(round.number)&&!lookup.has(round.number))lookup.set(round.number,round);
 }
 return definitions.map(definition=>({
  id:definition.id,title:definition.title,question:definition.question,
  rounds:definition.numbers.flatMap(number=>lookup.has(number)?[lookup.get(number)]:[]),
 })).filter(journey=>journey.rounds.length);
}

export function getJourney(catalogue,journeyId){
 return availableJourneys(catalogue).find(journey=>journey.id===journeyId)??null;
}

export function journeyRoundHref(round,journeyId){
 const definition=definitions.find(item=>item.id===journeyId);
 if(!round||!/^\d{2}$/.test(round.number))return './#discover';
 const path=`./play.html?level=${round.number}`;
 return definition?.numbers.includes(round.number)?`${path}&journey=${definition.id}`:path;
}

export function nextJourneyStep(catalogue,progressItems,journeyId,currentNumber){
 const journey=getJourney(catalogue,journeyId),index=journey?.rounds.findIndex(round=>round.number===currentNumber)??-1;
 if(!journey||index<0)return null;
 const completed=new Set((Array.isArray(progressItems)?progressItems:[]).filter(item=>item?.done===true).map(item=>item.round?.number));
 // Called on completion: the current round is finished even if persistence has
 // not yet been refreshed. Later steps take priority, then unfinished earlier
 // steps so entering midway cannot accidentally abandon part of the journey.
 completed.add(currentNumber);
 const after=[...journey.rounds.slice(index+1),...journey.rounds.slice(0,index)];
 const round=after.find(item=>!completed.has(item.number))??null;
 return {
  journey,round,complete:!round,
  href:round?journeyRoundHref(round,journey.id):'./#discover',
  label:round?'Continue journey':'Explore more puzzles',
 };
}
