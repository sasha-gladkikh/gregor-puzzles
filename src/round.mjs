// Public educational content only. No workbook rows, variants, or family data.
export const round={
 id:'clcn1-recessive-v1',number:'01',title:'Muscle-cell electrical balance',
 subtitle:'Discover how ion transport regulates skeletal muscle-cell excitability.',
 gene:'CLCN1',condition:'Recessive myotonia congenita',otherName:'Also known as Becker myotonia',
 clues:[
 {at:2,label:'Location',title:'Skeletal muscle-cell membrane',body:'This protein works in the membrane of skeletal muscle cells.',source:'MedlinePlus'},
 {at:4,label:'Function',title:'Chloride ion channel',body:'It forms an ion channel: a selective pathway for negatively charged chloride ions.',source:'MedlinePlus'},
 {at:6,label:'Mechanism',title:'Electrical excitability',body:'Chloride conductance helps stabilize electrical excitability so muscle activation stays controlled.',source:'MedlinePlus'},
 {at:8,label:'Inheritance',title:'Autosomal recessive',body:'This round concerns a condition associated with disease-causing variants in both copies of the gene.',source:'MedlinePlus'},
 {at:11,label:'The gene',title:'CLCN1',body:'The instructions for the ClC-1 chloride channel.',source:'MedlinePlus'},
 {at:12,label:'The condition',title:'Recessive myotonia congenita',body:'Delayed relaxation of skeletal muscles can cause stiffness after movement.',source:'MedlinePlus'}
 ],
 phenotypes:[['Myotonia','Muscles take longer to relax after contracting.'],['Muscle stiffness','Often more noticeable when moving after rest.'],['Warm-up effect','Repeated movement may temporarily ease stiffness.']],
 nuance:'Experiences vary. CLCN1 is also associated with a dominant form; the inheritance pattern belongs to the specific gene–condition relationship.',
 sources:[
 ['OMIM · condition #255700','https://omim.org/entry/255700'],
 ['MedlinePlus · genetics overview','https://medlineplus.gov/genetics/condition/myotonia-congenita/'],
 ['GeneReviews · clinical reference','https://www.ncbi.nlm.nih.gov/books/NBK1355/'],
 ['PLOS Biology · channel structure','https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000218']
 ],
 community:['Muscular Dystrophy Association','https://www.mda.org/disease/myotonia-congenita'],
 checked:'7 October 2026'
};

export const diagramDescription = 'A lipid membrane separates the outside of a skeletal muscle cell from its interior. A chloride channel consists of two joined protein subunits. Each subunit contains its own chloride pathway through the membrane. Chloride conductance helps stabilize muscle-cell electrical activity. This is a conceptual cross-section, not an atomic structure.';
export const pieceDescriptions = [
 'upper left: extracellular-space label', 'upper middle left: chloride ions above the first subunit',
 'upper middle right: chloride ions above the second subunit', 'upper right: chloride-ion label',
 'middle left: lipid membrane', 'middle left center: first subunit and its chloride pathway',
 'middle right center: second subunit and its separate chloride pathway', 'middle right: lipid membrane',
 'lower left: inside the muscle cell', 'lower middle left: base of the first subunit',
 'lower middle right: base of the second subunit', 'lower right: two-subunit channel caption'
];
export const checkpoints = {
 mechanism: {
  title: 'Connect function to muscle behavior',
  context: 'Chloride conductance helps keep muscle-cell electrical activity stable.',
  question: 'If this conductance is reduced, which outcome best fits the mechanism?',
  options: ['Muscles consistently relax faster after a contraction.', 'Muscles can stay electrically active longer and relax more slowly.', 'The muscle cell can no longer respond to any electrical signal.'],
  correct: 1,
  explanation: 'Reduced chloride conductance can allow repetitive electrical activity, prolonging contraction. This helps explain delayed relaxation (myotonia). It does not mean that every electrical response disappears.',
  source: 'https://medlineplus.gov/genetics/condition/myotonia-congenita/'
 },
 inheritance: {
  title: 'Connect inheritance to the condition',
  context: 'This round follows an autosomal recessive gene–condition relationship. A gene can be associated with more than one inheritance pattern.',
  question: 'Which statement best describes the recessive relationship in this round?',
  options: ['One disease-causing copy is sufficient for this recessive form.', 'Only an altered copy on the X chromosome can cause this form.', 'Disease-causing variants affect both copies of the gene.'],
  correct: 2,
  explanation: 'Autosomal recessive conditions involve disease-causing variants in both gene copies. A dominant association of the same gene is a different gene–condition relationship.',
  source: 'https://medlineplus.gov/genetics/condition/myotonia-congenita/'
 }
};
