// Optional art studies use their own save keys; the ten-round collection is unchanged.
export const studies={
 clean:{label:'Simplified illustration',artwork:'./artwork/studies/06-clean.webp',pieces:['curved terminal boundary','mitochondrial folds','upper vesicle','outer terminal curve','incoming calcium','calcium channel','vesicle fusion','right membrane edge','left receptor','postsynaptic membrane','transmitter and receptor','right receptor']},
 detailed:{label:'Detailed illustration',artwork:'./artwork/studies/06.webp',pieces:['mitochondrion','terminal filaments','upper vesicle','right vesicle','calcium entry','calcium channel','vesicle fusion','right terminal membrane','left receptor','cleft and lower membrane','transmitter and receptor','right receptor']}
};
export function applyArtworkStudy(round,variant){
 const study=round.number==='06'&&Object.hasOwn(studies,variant)?studies[variant]:null;
 return study?{...round,...study,study:variant,description:'A conceptual synapse. Teal calcium enters the upper presynaptic terminal through the channel at left. At right, a vesicle fuses with the membrane and releases amber neurotransmitter into the cleft. Receptors face the cleft on the lower cell. This depicts normal signaling, not the effect of a particular variant or a measured molecular structure.'}:round;
}
export function studySaveKey(round,fallback){return round.study?`gregor-puzzles:art-study:${round.study}:${round.id}`:fallback;}
