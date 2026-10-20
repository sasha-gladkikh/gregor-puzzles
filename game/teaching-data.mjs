// Small definitions for the terminology lens. Definitions explain vocabulary
// already used in the cited round content; they do not add diagnostic rules.
// `aliases` are literal alternate spellings or plural forms for text matching.
// Molecular terminology is paraphrased from NCBI Bookshelf, NIH glossaries,
// and the primary study cited for transcript decay;
// per-entry sources preserve provenance without repeating citations in each clue.
const vocabularySources={
 function:'https://www.ncbi.nlm.nih.gov/books/NBK26818/',
 conversion:'https://www.ncbi.nlm.nih.gov/books/NBK26898/',
 variants:'https://medlineplus.gov/genetics/understanding/mutationsanddisorders/possiblemutations/',
 splicing:'https://www.ncbi.nlm.nih.gov/books/NBK5191/',
 missense:'https://www.genome.gov/genetics-glossary/Missense-Mutation',
 frameshift:'https://www.genome.gov/genetics-glossary/Frameshift-Mutation',
 transcriptDecay:'https://pubmed.ncbi.nlm.nih.gov/34216550/',
 noncoding:'https://www.genome.gov/genetics-glossary/Non-Coding-DNA',
 dee:'https://www.ilae.org/guidelines/guidelines-and-reports/ilae-classification-of-the-epilepsies'
};
export const terminology=[
  {id:'loss-of-function',term:'loss of function',aliases:['loss-of-function'],definition:'Reduced or absent activity of a gene product. This describes its functional effect, not whether the condition is inherited dominantly or recessively.',sources:[vocabularySources.function]},
  {id:'gain-of-function',term:'gain of function',aliases:['gain-of-function'],definition:'Increased activity, activity at an inappropriate time or place, or a new activity of a gene product.',sources:[vocabularySources.function]},
  {id:'dominant-negative',term:'dominant negative',aliases:['dominant-negative'],definition:'An altered gene product interferes with the normal product. This describes a functional mechanism; autosomal dominant describes an inheritance pattern.',sources:[vocabularySources.function]},
  {id:'missense',term:'missense',aliases:[],definition:'A sequence change that replaces one amino acid with another in a protein. A missense variant may be benign or pathogenic.',sources:[vocabularySources.missense]},
  {id:'stop-gain',term:'stop-gain',aliases:['stop gain','nonsense'],definition:'A sequence change that creates an early stop signal in a protein-coding region. It can lead to a shortened protein or degradation of the RNA message.',sources:[vocabularySources.variants,vocabularySources.transcriptDecay]},
  {id:'truncating',term:'truncating',aliases:['protein-truncating'],definition:'Describes a variant predicted to shorten a protein, often through an early stop signal. Some affected RNA is degraded instead; the functional effect needs interpretation.',sources:[vocabularySources.variants,vocabularySources.transcriptDecay]},
  {id:'splice-site',term:'splice-site',aliases:['splice site','splice sites','splice-site variants'],definition:'A position in the sequence used to recognize an RNA splice junction. Variants here can change how introns are removed and exons are joined.',sources:[vocabularySources.splicing]},
  {id:'frameshift',term:'frameshift',aliases:['frameshifts'],definition:'A coding insertion or deletion that shifts the three-base reading frame, changing the downstream protein sequence. It often creates an early stop signal.',sources:[vocabularySources.frameshift]},
  {id:'gene-conversion',term:'gene conversion',aliases:['gene-conversion'],definition:'Transfer of sequence information from one DNA region to a similar region without a reciprocal exchange. It can copy changes from a pseudogene into a gene.',sources:[vocabularySources.conversion]},
  {id:'noncoding',term:'noncoding',aliases:['non-coding'],definition:'Describes sequence that does not encode protein. Such sequence can regulate genes or produce functional RNA; noncoding does not mean unimportant.',sources:[vocabularySources.noncoding]},
  {id:'repeat-expansion',term:'repeat expansion',aliases:['repeat expansions','repeat-expansion'],definition:'An increase in the number of copies of a short, repeated DNA sequence. Its effect depends on the sequence, size, and location of the expansion.',sources:[vocabularySources.variants]},
  {id:'developmental-and-epileptic-encephalopathy',term:'developmental and epileptic encephalopathy',aliases:['DEE'],definition:'Both the underlying disorder and epileptic activity contribute to developmental impairment. Their individual contributions can be difficult to separate.',sources:[vocabularySources.dee]},
  {id:'nucleoside',term:'nucleoside',aliases:['nucleosides'],definition:'A small molecule made of a sugar and a base, released when DNA or RNA is broken down.'},
  {id:'lysosome',term:'lysosome',aliases:['lysosomes','lysosomal'],definition:'A membrane-bound cell compartment that breaks down material so its smaller components can be reused.'},
  {id:'cochlea',term:'cochlea',aliases:['cochlear'],definition:'The hearing organ in the inner ear; its cells help convert sound into signals for the nervous system.'},
  {id:'gap-junction',term:'gap junction',aliases:['gap junctions','gap-junction'],definition:'A channel connection that lets neighboring cells directly exchange ions and small molecules.'},
  {id:'cytoplasm',term:'cytoplasm',aliases:['cytoplasmic'],definition:'The material inside a cell outside its nucleus, including the fluid and organelles.'},
  {id:'ribosome',term:'ribosome',aliases:['ribosomes','ribosomal'],definition:'The cell’s protein-making machinery: two subunits join to read an RNA message and assemble a protein.'},
  {id:'intron',term:'intron',aliases:['introns','intronic'],definition:'A segment copied into an initial RNA transcript and usually removed during splicing.'},
  {id:'exon',term:'exon',aliases:['exons'],definition:'A segment retained in the RNA product after splicing. Exons can contain coding or noncoding sequence.'},
  {id:'minor-spliceosome',term:'minor spliceosome',aliases:['minor-spliceosome'],definition:'Specialized RNA-and-protein machinery that removes a less common class of introns. “Minor” does not mean clinically unimportant.'},
  {id:'spliceosome',term:'spliceosome',aliases:['spliceosomes'],definition:'RNA-and-protein machinery that removes introns and joins the remaining segments of an RNA message.'},
  {id:'neurotransmitter',term:'neurotransmitter',aliases:['neurotransmitters'],definition:'A chemical signal released by a neuron that acts on another cell.'},
  {id:'synapse',term:'synapse',aliases:['synapses','synaptic'],definition:'A contact where a neuron communicates with another cell; this illustration shows communication by chemical signals.'},
  {id:'phosphatase',term:'phosphatase',aliases:['phosphatases'],definition:'An enzyme that removes a phosphate group from a molecule, which can change how signaling proteins behave.'},
  {id:'ras-mapk',term:'RAS/MAPK',aliases:['RAS / MAPK','RAS–MAPK'],definition:'A chain of cellular signals that helps regulate growth, development, and other cell responses.'},
  {id:'endoplasmic-reticulum',term:'endoplasmic reticulum',aliases:[],definition:'An interconnected membrane system where many proteins and lipids are made or processed.'},
  {id:'golgi',term:'Golgi',aliases:['Golgi apparatus'],definition:'A membrane system that modifies and routes cell materials and can also provide a platform for signaling.'},
  {id:'interferon',term:'interferon',aliases:['interferons'],definition:'A family of immune-signaling proteins that changes how cells respond to infection and other stimuli.'},
  {id:'ataxia',term:'ataxia',aliases:[],definition:'Difficulty coordinating movements, which can affect walking, balance, speech, or other actions.'},
  {id:'hypotonia',term:'hypotonia',aliases:[],definition:'Reduced muscle tone, meaning less resistance to passive movement; it is not the same as muscle weakness.'},
  {id:'nystagmus',term:'nystagmus',aliases:[],definition:'Involuntary, repetitive eye movements. Their direction can provide a useful clinical clue.'},
  {id:'sensorineural',term:'sensorineural',aliases:[],definition:'Describes hearing loss related to the inner ear or auditory nerve, rather than sound conduction through the outer or middle ear.'},
  {id:'histiocyte',term:'histiocyte',aliases:['histiocytes'],definition:'An immune cell found in tissues that helps process material and coordinate immune responses.'},
  {id:'histiocytosis',term:'histiocytosis',aliases:[],definition:'Accumulation of histiocytes, a type of immune cell, in tissues.'},
  {id:'cytopenia',term:'cytopenia',aliases:['cytopenias'],definition:'A lower-than-expected number of one or more types of blood cells.'},
  {id:'neutropenia',term:'neutropenia',aliases:[],definition:'A low number of neutrophils, white blood cells that help protect against infection.'},
  {id:'retina',term:'retina',aliases:['retinal'],definition:'The light-sensitive tissue lining the back of the eye.'},
  {id:'penetrance',term:'penetrance',aliases:[],definition:'The proportion of people with a particular genetic variant who develop its associated features. Reduced penetrance means some do not.'}
];

// Completion-only visual connections. Each label is an exact substring of the
// round's clinical.completionConnection. `landmark` is the zero-based index in
// illustration.landmarks; controls highlight the existing marker and structure.
// These labels intentionally name products only after the round is complete.
export const teachingConnections={
  '01':[{label:'ClC-1 chloride channel',landmark:0},{label:'skeletal muscle',landmark:2}],
  '02':[{label:'gap junctions',landmark:0},{label:'ions and small molecules',landmark:1},{label:'inner-ear cells',landmark:2}],
  '03':[{label:'transporter',landmark:1},{label:'lysosomes',landmark:0}],
  '04':[{label:'remove a blocker',landmark:1},{label:'ribosomes can form',landmark:2}],
  '05':[{label:'small RNA',landmark:0},{label:'RNA splicing',landmark:2}],
  '06':[{label:'calcium channel',landmark:0},{label:'release of chemical signals',landmark:1}],
  '07':[{label:'SHP-2',landmark:1},{label:'RAS/MAPK signaling',landmark:2}],
  '08':[{label:'minor spliceosome',landmark:0},{label:'introns',landmark:1}],
  '09':[{label:'endoplasmic reticulum',landmark:0},{label:'Golgi',landmark:1},{label:'signal active',landmark:2}],
  '10':[{label:'GAA repeat',landmark:1},{label:'neuronal electrical activity',landmark:2}]
};
