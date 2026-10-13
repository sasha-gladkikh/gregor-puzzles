import {clinicalProfiles} from './clinical.mjs';
import {illustrations} from './artwork-data.mjs';
import {round as first, diagramDescription as firstDescription, pieceDescriptions as firstPieces} from './round.mjs';

const med = path => `https://medlineplus.gov/genetics/${path}/`;
const nord = ['NORD · rare disease support', 'https://rarediseases.org/'];
const AR = 'Autosomal recessive', AD = 'Autosomal dominant';

const entries=[
 {gene:'GJB2',omim:'220290',id:'gjb2-dfnb1a-v1',title:'A connection between cells',topic:'Cell communication',
  condition:'Autosomal recessive nonsyndromic hearing loss 1A',otherName:'Also called DFNB1A',inheritance:AR,
  clues:[['Location','Neighboring inner-ear cells','Gap junctions connect cells in the cochlea.'],['Function','Sharing ions and small molecules','Connexin channels support communication between adjacent cells.'],['Mechanism','Reduced gap-junction function','Loss-of-function variants can disrupt these connections.']],
  geneBody:'Encodes connexin 26, a gap-junction protein.',conditionBody:'A gene–condition relationship associated with hearing differences.',
  variant:'Loss-of-function variants, including truncating and some missense changes.',
  phenotypes:[['Sensorineural hearing loss','Differences in how sound is detected in the inner ear.'],['Often present early','Hearing differences may be present at birth.'],['Variable degree','Hearing levels range from mild to profound.']],
  nuance:'This round concerns the recessive nonsyndromic association. Other GJB2 variants have different effects. Deaf and hard-of-hearing people have diverse identities and communication preferences.',
  summary:'Gap junctions help neighboring cochlear cells exchange small molecules and ions. Disrupted connexin 26 function can affect hearing.',
  description:'Two adjacent cells have facing membranes. Paired channel halves bridge the gap between them, allowing ions and small molecules to pass directly from one cell to the other. The drawing is conceptual.',
  pieces:['cell A heading','upper membrane ends','cell B heading','small molecule label','cell A cytoplasm','first channel half','second channel half','cell B cytoplasm','exchange legend','shared channel passage','membrane junction','cell communication caption'],
  sources:[['MedlinePlus · GJB2',med('gene/gjb2')],['GeneReviews · recessive hearing loss','https://www.ncbi.nlm.nih.gov/books/NBK1272/']],community:nord},
 {gene:'SLC29A3',omim:'602782',id:'slc29a3-hlps-v1',title:'The cell’s recycling route',topic:'Lysosomal transport',
  condition:'Histiocytosis-lymphadenopathy plus syndrome',otherName:'Also called SLC29A3 spectrum disorder',inheritance:AR,
  clues:[['Location','Lysosomal membrane','Lysosomes break down cellular material for reuse.'],['Function','Nucleoside transport','A transporter helps move nucleosides across internal membranes.'],['Mechanism','Impaired molecular recycling','Reduced transport can disturb nucleoside handling.']],
  geneBody:'Encodes equilibrative nucleoside transporter 3, or ENT3.',conditionBody:'A variable spectrum involving histiocytes and other tissues.',
  variant:'Biallelic variants that reduce or eliminate ENT3 activity.',
  phenotypes:[['Histiocytosis','Immune cells called histiocytes accumulate in tissues.'],['Lymphadenopathy','Lymph nodes may become enlarged.'],['Skin changes','Some people have darker patches with increased hair growth.']],
  nuance:'The combination of features varies, including within families. The steps connecting impaired transport to every clinical feature are not fully understood.',
  summary:'ENT3 participates in intracellular nucleoside transport. Reduced function is associated with a broad histiocytosis spectrum; the full disease mechanism remains under study.',
  description:'A lysosome contains broken-down RNA and DNA building blocks. Nucleosides pass through a membrane transporter toward a cellular reuse pool. This is a simplified recycling pathway, not a complete model of the condition.',
  pieces:['lysosome heading','lysosome boundary','recycling direction','cellular reuse heading','lysosome contents','nucleosides inside','membrane transporter','nucleosides outside','breakdown caption','transport pathway','reuse pool','conceptual pathway caption'],
  sources:[['MedlinePlus · condition',med('condition/histiocytosis-lymphadenopathy-plus-syndrome')],['MedlinePlus · SLC29A3',med('gene/slc29a3')]],community:nord},
 {gene:'SBDS',omim:'260400',id:'sbds-sds1-v1',title:'Preparing the protein factory',topic:'Ribosome assembly',
  condition:'Shwachman-Diamond syndrome 1',otherName:'SBDS-related Shwachman-Diamond syndrome',inheritance:AR,
  clues:[['Location','Maturing ribosomal subunits','This factor acts during preparation of the large ribosomal subunit.'],['Function','Ribosome maturation','It helps release a blocking factor so the subunits can join.'],['Mechanism','Reduced ribosome assembly','Less functional protein can impair ribosome formation.']],
  geneBody:'Encodes a ribosome maturation factor.',conditionBody:'A condition that can affect the pancreas, blood cell production, and skeleton.',
  variant:'Often splice-site or truncating variants; gene conversion can transfer changes from a nearby pseudogene.',
  phenotypes:[['Pancreatic insufficiency','The pancreas may make too few digestive enzymes.'],['Neutropenia','Numbers of infection-fighting neutrophils may be low.'],['Skeletal differences','Bone development and growth may be affected.']],
  nuance:'Several genes can cause Shwachman-Diamond-like disorders. This level concerns SBDS. Features vary, and the link from ribosome dysfunction to individual features is complex.',
  summary:'SBDS helps release eIF6 from the large ribosomal subunit. This permits the large and small subunits to assemble into a working ribosome.',
  description:'A large ribosomal subunit carries a blocking factor. A maturation step releases that factor, allowing a small subunit to join. A completed ribosome is shown beside an RNA strand. Shapes represent assembly steps, not atomic structures.',
  pieces:['assembly heading','large subunit top','blocking factor','release arrow','large subunit','maturation factor','small subunit','joining pathway','RNA strand','assembled ribosome','protein synthesis','ribosome caption'],
  sources:[['MedlinePlus · SBDS',med('gene/sbds')],['MedlinePlus · condition',med('condition/shwachman-diamond-syndrome')],['GeneReviews · Shwachman-Diamond syndrome','https://www.ncbi.nlm.nih.gov/books/NBK1756/']],community:['Shwachman-Diamond Syndrome Foundation','https://shwachman-diamond.org/']},
 {gene:'RNU4-2',omim:'620851',id:'rnu4-2-renu-v1',title:'Editing the RNA message',topic:'Major RNA splicing',
  condition:'ReNU syndrome',otherName:'RNU4-2-related autosomal dominant neurodevelopmental disorder',inheritance:AD,
  clues:[['Location','The nuclear spliceosome','RNA messages are processed in the nucleus.'],['Function','A small nuclear RNA','The gene produces a functional RNA, not a protein.'],['Mechanism','Altered RNA splicing','Disease-associated changes can disturb splice-site use.']],
  geneBody:'Encodes a U4 small nuclear RNA of the major spliceosome.',conditionBody:'A neurodevelopmental condition associated with particular RNA variants.',
  variant:'Heterozygous noncoding small-nuclear-RNA variants, often arising de novo.',
  phenotypes:[['Developmental delay','Motor and other developmental milestones may take longer.'],['Hypotonia','Muscle tone may be reduced.'],['Speech and language differences','Communication development can require substantial support.']],
  nuance:'This level covers the dominant ReNU association in the GFT. RNU4-2 also has a distinct recessive association; a gene name alone does not specify inheritance or outcome.',
  summary:'A functional RNA helps the major spliceosome process RNA messages. A variant can affect a noncoding RNA itself, even when no protein-coding sequence changes.',
  description:'A pre-messenger RNA has two exon segments separated by an intron. A major spliceosome containing small nuclear RNAs processes the message, removing the intron and joining the exons. The diagram is a simplified sequence of steps.',
  pieces:['RNA processing heading','nucleus label','pre-RNA label','exon label','first exon','intron loop','RNA-containing spliceosome','second exon','joined exon one','joined exon two','removed intron','RNA processing caption'],
  sources:[['Chen et al. · Nature 2024','https://www.nature.com/articles/s41586-024-07773-7'],['GeneReviews · ReNU syndrome','https://www.ncbi.nlm.nih.gov/books/NBK622730/'],['Nature 2026 · distinct dominant and recessive associations','https://www.nature.com/articles/s41586-026-10334-9']],community:['ReNU Syndrome United','https://www.renusyndrome.org/']},
 {gene:'CACNA1A',omim:'617106',id:'cacna1a-dee42-v1',title:'Passing the neural signal',topic:'Synaptic communication',
  condition:'Developmental and epileptic encephalopathy 42',otherName:'CACNA1A-related DEE42',inheritance:AD,
  clues:[['Location','Neuronal cell membranes','Calcium channels help neurons communicate.'],['Function','Calcium entry and transmitter release','A pore-forming subunit contributes to the CaV2.1 channel.'],['Mechanism','Altered channel activity','Different disease-associated variants can increase or decrease activity.']],
  geneBody:'Encodes the pore-forming alpha-1A subunit of CaV2.1.',conditionBody:'A neurodevelopmental condition that includes epilepsy.',
  variant:'Heterozygous variants affecting channel function; effects are variant-dependent.',
  phenotypes:[['Epilepsy','Recurrent seizures may occur.'],['Developmental delay','Development can be affected in several areas.'],['Hypotonia or ataxia','Muscle tone or movement coordination may be affected.']],
  nuance:'CACNA1A has several distinct disease associations. Increased and decreased channel activity have both been reported in developmental epileptic encephalopathies.',
  summary:'CaV2.1 helps couple calcium entry to neurotransmitter release. Disturbed channel function can alter communication between neurons.',
  description:'A presynaptic terminal contains calcium channels and transmitter-filled vesicles. Calcium entry supports vesicle release into a synaptic gap, where transmitter molecules reach receptors on a neighboring neuron. The diagram represents normal signaling.',
  pieces:['neuron heading','presynaptic terminal','calcium ions','channel label','vesicles','calcium channel','release site','synaptic gap','neighboring neuron','receptors','transmitter molecules','neural signaling caption'],
  sources:[['MedlinePlus · CACNA1A',med('gene/cacna1a')],['Jiang et al. · channel effects in DEE','https://doi.org/10.1111/epi.16316']],community:['CACNA1A Foundation','https://www.cacna1a.org/']},
 {gene:'PTPN11',omim:'163950',id:'ptpn11-noonan1-v1',title:'Keeping growth signals in balance',topic:'RAS / MAPK signaling',
  condition:'Noonan syndrome 1',otherName:'PTPN11-related Noonan syndrome',inheritance:AD,
  clues:[['Location','Intracellular signaling complexes','A regulatory protein participates in signals inside cells.'],['Function','Regulating RAS / MAPK','This pathway helps coordinate growth and development.'],['Mechanism','Excess signaling','Noonan-associated variants can increase regulatory protein activity.']],
  geneBody:'Encodes the SHP-2 protein tyrosine phosphatase.',conditionBody:'A developmental condition with a variable combination of features.',
  variant:'Typically heterozygous missense variants that increase SHP-2 activity.',
  phenotypes:[['Short stature','Growth may be below the usual range.'],['Heart differences','Congenital heart conditions can occur.'],['Bleeding tendency','Some people have altered blood clotting.']],
  nuance:'Noonan syndrome has multiple genetic causes, and PTPN11 has other disease associations. Features and support needs differ among individuals.',
  summary:'SHP-2 helps regulate RAS/MAPK signals during development. Noonan-associated variants can increase signaling activity.',
  description:'A signal received at a cell membrane enters a simplified pathway through a regulatory protein, RAS, and a MAPK cascade, reaching a nucleus. Arrows show information flow rather than a full set of direct binding interactions.',
  pieces:['signal heading','external growth signal','membrane receptor','signal reception','regulator','RAS node','MAPK cascade','pathway arrow','nuclear boundary','gene regulation','developmental output','signaling caption'],
  sources:[['MedlinePlus · PTPN11',med('gene/ptpn11')],['MedlinePlus · Noonan syndrome',med('condition/noonan-syndrome')]],community:['Noonan Syndrome Foundation','https://www.teamnoonan.org/']},
 {gene:'RNU4ATAC',omim:'616651',id:'rnu4atac-roifman-v1',title:'The specialist RNA editor',topic:'Minor RNA splicing',
  condition:'Roifman syndrome',otherName:'One condition within the RNU4atac-opathy spectrum',inheritance:AR,
  clues:[['Location','The nuclear minor spliceosome','A specialized spliceosome processes a small class of introns.'],['Function','A noncoding small nuclear RNA','A functional RNA helps process minor introns.'],['Mechanism','Impaired minor-intron splicing','Altered splicing can affect multiple cellular pathways.']],
  geneBody:'Encodes U4atac RNA, part of the minor spliceosome.',conditionBody:'A condition involving growth, the skeleton, immunity, and vision.',
  variant:'Biallelic variants in a noncoding small-nuclear-RNA gene.',
  phenotypes:[['Skeletal dysplasia','Bone growth and shape can differ.'],['Immunodeficiency','Antibody responses may be impaired.'],['Retinal dystrophy','Changes to the retina can affect vision.']],
  nuance:'RNU4ATAC also has other condition associations, including MOPD I. This puzzle specifically concerns Roifman syndrome, not every RNU4ATAC-related presentation.',
  summary:'The minor spliceosome removes a specialized class of introns. Changes in U4atac RNA can impair this process across multiple genes.',
  description:'Two RNA processing routes are compared. The common-intron route uses the major spliceosome. A highlighted minor-intron route uses specialized small nuclear RNAs. Both routes join exon segments; the highlighted route is the subject of this puzzle.',
  pieces:['RNA routes heading','common intron label','major pathway','common processed RNA','minor intron label','specialist RNA complex','minor processing arrow','joined minor-route exons','comparison legend','functional RNA label','specialist pathway','minor splicing caption'],
  sources:[['Merico et al. · Nature Communications 2015','https://www.nature.com/articles/ncomms9718'],['GeneReviews · RNU4atac-opathy','https://www.ncbi.nlm.nih.gov/books/NBK589232/']],community:nord},
 {gene:'STING1',omim:'615934',id:'sting1-savi-v1',title:'When the immune signal stays on',topic:'Innate immune signaling',
  condition:'STING-associated vasculopathy with onset in infancy',otherName:'Also called SAVI',inheritance:AD,
  clues:[['Location','Intracellular membrane signaling','The STING signaling system operates on internal cell membranes.'],['Function','Interferon signaling','This pathway helps the innate immune response.'],['Mechanism','Gain of function','Excess pathway activity can drive damaging inflammation.']],
  geneBody:'Encodes the STING immune-signaling protein.',conditionBody:'An autoinflammatory condition involving blood vessels and other tissues.',
  variant:'Heterozygous gain-of-function variants, often arising de novo.',
  phenotypes:[['Skin inflammation','Inflammatory skin changes may occur early.'],['Blood-vessel involvement','Small blood vessels can be affected.'],['Interstitial lung disease','Inflammation can affect lung tissue.']],
  nuance:'Features vary. This round explains the gain-of-function relationship in SAVI, not every possible effect of a STING1 variant.',
  summary:'STING supports interferon signaling. Excess activity can sustain inflammation and affect the skin, blood vessels, and lungs.',
  description:'An internal membrane signaling hub connects to an interferon response. Two conceptual output tracks compare a regulated signal with a sustained signal. The figure illustrates signal persistence rather than a specific patient or quantitative experiment.',
  pieces:['immune signal heading','internal membrane','signal hub','interferon output','regulated pathway','signal pulse','response checkpoint','regulated output','sustained pathway','persistent signal','inflammatory output','immune signaling caption'],
  sources:[['MedlinePlus · SAVI',med('condition/sting-associated-vasculopathy-with-onset-in-infancy')],['MedlinePlus · STING1',med('gene/sting1')],['Liu et al. · activated STING','https://doi.org/10.1056/NEJMoa1312625']],community:nord},
 {gene:'FGF14',omim:'620174',id:'fgf14-sca27b-v1',title:'A repeated sequence in the genome',topic:'Repeat expansions',
  condition:'Spinocerebellar ataxia 27B',otherName:'Also called GAA-FGF14-related ataxia',inheritance:AD,
  clues:[['Location','An intronic DNA sequence','The relevant repeated sequence lies within an intron.'],['Function','Neuronal signaling support','The gene’s protein helps regulate neuronal electrical activity.'],['Mechanism','A GAA repeat expansion','An expanded noncoding repeat is associated with this condition.']],
  geneBody:'Encodes fibroblast growth factor 14, an intracellular neuronal protein.',conditionBody:'An often adult-onset condition affecting coordination and balance.',
  variant:'A GAA trinucleotide repeat expansion in intron 1. Repeat size and structure matter.',
  phenotypes:[['Gait ataxia','Walking balance and coordination can be affected.'],['Episodic symptoms','Some people first experience intermittent symptoms.'],['Downbeat nystagmus','Involuntary downward eye movements may occur.']],
  nuance:'This is the SCA27B repeat-expansion association, distinct from other FGF14 conditions. Age at onset and penetrance vary; the illustration does not define diagnostic repeat thresholds.',
  summary:'A sequence can change by gaining repeat units rather than by changing a single base. In SCA27B, the relevant expansion is intronic.',
  description:'Two simplified DNA tracks compare a shorter GAA repeat with a longer repeat between exon blocks. A separate neuronal network connects the gene to electrical signaling. Repeat counts in this illustration are symbolic, not diagnostic cutoffs.',
  pieces:['DNA repeat heading','exon one','intron label','exon two','shorter repeat track','GAA units','expanded repeat track','repeat continuation','neuron branches','neuronal body','electrical signal','symbolic repeat caption'],
  sources:[['GeneReviews · GAA-FGF14-related ataxia','https://www.ncbi.nlm.nih.gov/books/NBK599589/'],['Pellerin et al. · NEJM repeat discovery','https://doi.org/10.1056/NEJMoa2207406']],community:['SCA27b Ataxia Foundation','https://www.sca27b.org/']}
];

const base={...first,omim:'255700',topic:'Membrane transport',inheritance:AR,variant:'Biallelic variants that reduce chloride-channel function.',summary:'Reduced chloride conductance can prolong muscle electrical activity and delay relaxation. This round focuses on the recessive gene–condition relationship.',description:firstDescription,pieces:firstPieces};
const introductoryRounds=[base,...entries.map((r,index)=>({...r,
 number:String(index+2).padStart(2,'0'),
 clues:[...r.clues.map(([label,title,body],i)=>({at:[2,4,6][i],label,title,body})),
  {at:8,label:'Inheritance',title:r.inheritance,body:r.inheritance===AR?'Disease-causing variants affect both gene copies.':'A disease-causing variant in one gene copy can be sufficient.'},
  {at:11,label:'The gene',title:r.gene,body:r.geneBody},{at:12,label:'The condition',title:r.condition,body:r.conditionBody}],
 sources:[[ `OMIM · condition #${r.omim}`,`https://omim.org/entry/${r.omim}`],...r.sources]
}))].map(r=>({...r,checked:'10 October 2026',reviewStatus:'Pending scientific review',
 sourceNote:'Original educational summary based on the linked references. OMIM links identify the condition; phenotype prose is paraphrased from the other cited sources. Illustrations are conceptual, not patient images or atomic structures.'}));

export const rounds=introductoryRounds.map(r=>{
 const clinical=clinicalProfiles[r.gene];
 const illustration=illustrations[r.number];
 const sources=new Map(r.sources.map(([label,url])=>[url,label]));
 if(!sources.has(illustration.source))sources.set(illustration.source,'Illustration · mechanistic reference');
 if(illustration.noteSource&&!sources.has(illustration.noteSource))sources.set(illustration.noteSource,'Spliceosome · assembly and activation');
 const referenceNames={
  'https://www.ncbi.nlm.nih.gov/books/NBK1124/':'GeneReviews · Noonan syndrome',
  'https://www.nature.com/articles/s41591-024-03085-5':'Greene et al. · RNU4-2 phenotype and discovery (2024)',
  'https://www.nature.com/articles/s41588-026-02554-6':'RNU4-2 · distinct recessive association (2026)',
  'https://pubmed.ncbi.nlm.nih.gov/31468518/':'Jiang et al. · CACNA1A gain and loss of function (2019)',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4613477/':'Damaj et al. · CACNA1A neurodevelopmental spectrum (2015)',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC9458680/':'Clinical and genetic characterization of CACNA1A-related disease (2022)',
  'https://pubmed.ncbi.nlm.nih.gov/24534818/':'Prendiville et al. · cardiac genotype–phenotype associations (2014)',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/':'Liu et al. · activated STING and SAVI (2014)',
  'https://www.nejm.org/doi/10.1056/NEJMoa2207406':'Pellerin et al. · FGF14 repeat-expansion discovery',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC10784672/':'Clinical and genetic keys to GAA-FGF14 ataxia'
 };
 const urls=[clinical.patternSource,...clinical.features.map(f=>f.source),...clinical.pearls.map(p=>p.source)];
 for(const url of urls) if(!sources.has(url)) sources.set(url,referenceNames[url]??(url.includes('ncbi.nlm.nih.gov/books')?'GeneReviews · clinical and molecular reference':url.includes('medlineplus')?'MedlinePlus Genetics · clinical reference':'Primary research · clinical and molecular evidence'));
 return {...r,clinical,illustration,artwork:`./artwork/${r.number}.webp${new URL(import.meta.url).search}`,description:illustration.description,pieces:illustration.pieces,phenotypes:clinical.features.map(f=>[f.title,f.text]),
  sourceNote:r.sourceNote+' New conceptual artwork was generated with AI and simplified for learning. Scientific review is pending.',
  sources:[...sources].map(([url,label])=>[label,url]),
  clues:r.clues.map(c=>c.at===6?{at:6,label:'Clinical pattern',title:'Connect the clinical findings',body:clinical.pattern,sourceUrl:clinical.patternSource}:c)
 };
});
// Keep the early clue anonymous; the gene name is revealed at piece 11.
rounds.find(r=>r.gene==='STING1').clues[0].body='An intracellular signaling system operates on internal cell membranes.';

export function findRound(value) {return rounds.find(r=>r.number===value||r.id===value)??rounds[0];}
export const saveKey=round=>`gregor-puzzles:${round.id}`;
