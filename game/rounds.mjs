import {clinicalProfiles} from './clinical.mjs';
import {illustrations} from './artwork-data.mjs';
import {signoff,requireApproval,isApproved} from './signoff.mjs';
import {hpoTerms} from './hpo-terms.mjs';
import {interpretationSources} from './interpretation.mjs';

// Public educational content only. No workbook rows, variants, or family data.
const med = path => `https://medlineplus.gov/genetics/${path}/`;
const nord = ['NORD · rare disease support', 'https://rarediseases.org/'];
const AR = 'Autosomal recessive', AD = 'Autosomal dominant';

// Each entry supplies only what players or reviewers see. Location and function clues
// unlock at 2 and 4 pieces; the clinical pattern, inheritance, gene, and condition follow.
const entries=[
 {gene:'CLCN1',omim:'255700',id:'clcn1-recessive-v1',title:'Muscle-cell electrical balance',topic:'Membrane transport',
  condition:'Recessive myotonia congenita',otherName:'Also known as Becker myotonia',inheritance:AR,
  clues:[['Location','Skeletal muscle-cell membrane','This protein works in the membrane of skeletal muscle cells.'],['Function','Let chloride ions cross','It forms a selective pathway through the membrane for negatively charged chloride ions.']],
  geneBody:'Encodes the ClC-1 chloride channel.',conditionBody:'Delayed relaxation of skeletal muscles can cause stiffness after movement.',
  variant:'Biallelic variants that reduce chloride-channel function.',
  nuance:'Experiences vary. CLCN1 is also associated with a dominant form; the inheritance pattern belongs to the specific gene–condition relationship.',
  summary:'Reduced chloride conductance can prolong muscle electrical activity and delay relaxation. This round focuses on the recessive gene–condition relationship.',
  sources:[['MedlinePlus · genetics overview',med('condition/myotonia-congenita')],['GeneReviews · clinical reference','https://www.ncbi.nlm.nih.gov/books/NBK1355/'],['PLOS Biology · channel structure','https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000218']],
  community:['Muscular Dystrophy Association','https://www.mda.org/disease/myotonia-congenita']},
 {gene:'GJB2',omim:'220290',id:'gjb2-dfnb1a-v1',title:'A connection between cells',topic:'Cell communication',
  condition:'Autosomal recessive nonsyndromic hearing loss 1A',otherName:'Also called DFNB1A',inheritance:AR,
  clues:[['Location','Neighboring inner-ear cells','Gap junctions connect cells in the cochlea, the hearing organ of the inner ear.'],['Function','Share ions and small molecules','These channels provide a direct passage between neighboring cells.']],
  geneBody:'Encodes connexin 26, a gap-junction protein.',conditionBody:'Sensorineural hearing loss without the skin findings of other GJB2 associations.',
  variant:'Loss-of-function variants, including truncating and some missense changes.',
  nuance:'This round concerns the recessive nonsyndromic association. Other GJB2 variants have different effects. Deaf and hard-of-hearing people have diverse identities and communication preferences.',
  summary:'Gap junctions help neighboring cochlear cells exchange small molecules and ions. Disrupted connexin 26 function can affect hearing.',
  sources:[['MedlinePlus · GJB2',med('gene/gjb2')],['GeneReviews · recessive hearing loss','https://www.ncbi.nlm.nih.gov/books/NBK1272/']],community:nord},
 {gene:'SLC29A3',omim:'602782',id:'slc29a3-hlps-v1',title:'The cell’s recycling route',topic:'Lysosomal transport',
  condition:'Histiocytosis-lymphadenopathy plus syndrome',otherName:'Includes H syndrome and related historical diagnoses',inheritance:AR,
  clues:[['Location','Lysosomal membrane','Lysosomes are cell compartments that break down material for reuse.'],['Function','Transport recycling products','A transporter moves nucleosides, small building blocks released from DNA and RNA, across internal membranes.']],
  geneBody:'Encodes equilibrative nucleoside transporter 3, or ENT3.',conditionBody:'A variable spectrum involving histiocytes and other tissues.',
  variant:'Biallelic variants that reduce or eliminate ENT3 activity.',
  nuance:'The combination of features varies, including within families. The steps connecting impaired transport to every clinical feature are not fully understood.',
  summary:'ENT3 participates in intracellular nucleoside transport. Reduced function is associated with a broad histiocytosis spectrum; the full disease mechanism remains under study.',
  sources:[['MedlinePlus · condition',med('condition/histiocytosis-lymphadenopathy-plus-syndrome')],['MedlinePlus · SLC29A3',med('gene/slc29a3')],['Nair et al. · Slc29a3 mouse model (2019)','https://www.nature.com/articles/s41467-019-10925-3']],community:nord},
 {gene:'SBDS',omim:'260400',id:'sbds-sds1-v1',title:'Preparing the protein factory',topic:'Ribosome maturation',
  condition:'Shwachman-Diamond syndrome 1',otherName:'SBDS-related Shwachman-Diamond syndrome',inheritance:AR,
  clues:[['Location','Maturing ribosomal subunits','Ribosomes make proteins. This factor helps prepare the larger of their two subunits.'],['Function','Prepare a working ribosome','It helps release a blocking factor so the large and small subunits can join.']],
  geneBody:'Encodes a ribosome maturation factor.',conditionBody:'A condition that can affect the pancreas, blood cell production, and skeleton.',
  variant:'Often splice-site or truncating variants; gene conversion can transfer changes from a nearby pseudogene.',
  nuance:'Several genes can cause Shwachman-Diamond-like disorders. This round concerns SBDS. Features vary, and the link from ribosome dysfunction to individual features is complex.',
  summary:'SBDS helps release eIF6 from the large ribosomal subunit. This permits the large and small subunits to assemble into a working ribosome.',
  sources:[['MedlinePlus · SBDS',med('gene/sbds')],['MedlinePlus · condition',med('condition/shwachman-diamond-syndrome')],['GeneReviews · Shwachman-Diamond syndrome','https://www.ncbi.nlm.nih.gov/books/NBK1756/']],community:['Shwachman-Diamond Syndrome Foundation','https://shwachman-diamond.org/']},
 {gene:'RNU4-2',omim:'620851',id:'rnu4-2-renu-v1',title:'Splicing an RNA message',topic:'Major RNA splicing',
  condition:'ReNU syndrome',otherName:'RNU4-2-related autosomal dominant neurodevelopmental disorder',inheritance:AD,
  clues:[['Location','The nuclear spliceosome','The spliceosome is machinery in the nucleus that removes introns and joins the remaining RNA segments.'],['Function','Help assemble the splicing machinery','The gene produces a small RNA that helps the spliceosome assemble. Its functional product is RNA itself.']],
  geneBody:'Encodes a U4 small nuclear RNA of the major spliceosome.',conditionBody:'A neurodevelopmental condition associated with particular RNA variants.',
  variant:'Heterozygous noncoding small-nuclear-RNA variants, often arising de novo.',
  nuance:'This round covers the dominant ReNU association. RNU4-2 also has a distinct recessive association; a gene name alone does not specify inheritance or outcome.',
  summary:'A functional RNA helps the major spliceosome process RNA messages. A variant can affect a noncoding RNA itself, even when no protein-coding sequence changes.',
  sources:[['Chen et al. · Nature 2024','https://www.nature.com/articles/s41586-024-07773-7'],['GeneReviews · ReNU syndrome','https://www.ncbi.nlm.nih.gov/books/NBK622730/'],['Nature 2026 · distinct dominant and recessive associations','https://www.nature.com/articles/s41586-026-10334-9']],community:['ReNU Syndrome United','https://www.renusyndrome.org/']},
 {gene:'CACNA1A',omim:'617106',id:'cacna1a-dee42-v1',title:'Passing the neural signal',topic:'Synaptic communication',
  condition:'Developmental and epileptic encephalopathy 42',otherName:'CACNA1A-related DEE42',inheritance:AD,aliases:['CACNL1A4'],
  clues:[['Location','Nerve-ending membranes','Calcium channels in nerve endings help neurons communicate.'],['Function','Trigger chemical-signal release','Calcium enters through the channel and helps trigger release of neurotransmitters, the chemical signals between neurons.']],
  geneBody:'Encodes the pore-forming alpha-1A subunit of CaV2.1.',conditionBody:'A neurodevelopmental condition that includes epilepsy.',
  variant:'Heterozygous variants affecting channel function; effects are variant-dependent.',
  nuance:'CACNA1A has several distinct disease associations. Increased and decreased channel activity have both been reported in developmental epileptic encephalopathies.',
  summary:'CaV2.1 helps couple calcium entry to neurotransmitter release. Disturbed channel function can alter communication between neurons.',
  sources:[['MedlinePlus · CACNA1A',med('gene/cacna1a')],['Jiang et al. · CACNA1A gain and loss of function (2019)','https://pubmed.ncbi.nlm.nih.gov/31468518/']],community:['CACNA1A Foundation','https://www.cacna1a.org/']},
 {gene:'PTPN11',omim:'163950',id:'ptpn11-noonan1-v1',title:'Keeping growth signals in balance',topic:'RAS / MAPK signaling',
  condition:'Noonan syndrome 1',otherName:'PTPN11-related Noonan syndrome',inheritance:AD,
  clues:[['Location','Intracellular signaling complexes','A regulatory protein participates in signals inside cells.'],['Function','Regulate growth signals','The protein regulates the RAS/MAPK pathway, which helps coordinate growth and development.']],
  geneBody:'Encodes the SHP-2 protein tyrosine phosphatase.',conditionBody:'A developmental condition with a variable combination of features.',
  variant:'Typically heterozygous missense variants that increase SHP-2 activity.',
  nuance:'Noonan syndrome has multiple genetic causes, and PTPN11 has other disease associations. Features and support needs differ among individuals.',
  summary:'SHP-2 helps regulate RAS/MAPK signals during development. Noonan-associated variants can increase signaling activity.',
  sources:[['MedlinePlus · PTPN11',med('gene/ptpn11')],['MedlinePlus · Noonan syndrome',med('condition/noonan-syndrome')]],community:['Noonan Syndrome Foundation','https://www.teamnoonan.org/']},
 {gene:'RNU4ATAC',omim:'616651',id:'rnu4atac-roifman-v1',title:'A specialist RNA splicing system',topic:'Minor RNA splicing',
  condition:'Roifman syndrome',otherName:'One condition within the RNU4atac-opathy spectrum',inheritance:AR,
  clues:[['Location','The nuclear minor spliceosome','This specialized machinery removes a less common class of introns from RNA messages.'],['Function','Help process specialized introns','A small functional RNA helps the minor spliceosome assemble. “Minor” describes the system, not the importance of its work.']],
  geneBody:'Encodes U4atac RNA, part of the minor spliceosome.',conditionBody:'A condition involving growth, the skeleton, immunity, and vision.',
  variant:'Biallelic variants in a noncoding small-nuclear-RNA gene.',
  nuance:'RNU4ATAC also has other condition associations, including MOPD I. This round specifically concerns Roifman syndrome, not every RNU4ATAC-related presentation.',
  summary:'The minor spliceosome removes a specialized class of introns. Changes in U4atac RNA can impair this process across multiple genes.',
  sources:[['Merico et al. · Nature Communications 2015','https://www.nature.com/articles/ncomms9718'],['GeneReviews · RNU4atac-opathy','https://www.ncbi.nlm.nih.gov/books/NBK589232/']],community:nord},
 {gene:'STING1',omim:'615934',id:'sting1-savi-v1',title:'When the immune signal stays on',topic:'Innate immune signaling',
  condition:'STING-associated vasculopathy with onset in infancy',otherName:'Also called SAVI',inheritance:AD,aliases:['TMEM173'],
  clues:[['Location','Internal cell membranes','An immune-signaling protein moves between the endoplasmic reticulum and Golgi during activation.'],['Function','Activate an immune response','The pathway promotes interferon signaling. Excess activity can sustain inflammation.']],
  geneBody:'Encodes the STING immune-signaling protein.',conditionBody:'An autoinflammatory condition involving blood vessels and other tissues.',
  variant:'Heterozygous gain-of-function variants, often arising de novo.',
  nuance:'Features vary. This round explains the gain-of-function relationship in SAVI, not every possible effect of a STING1 variant.',
  summary:'STING supports interferon signaling. Excess activity can sustain inflammation and affect the skin, blood vessels, and lungs.',
  sources:[['MedlinePlus · SAVI',med('condition/sting-associated-vasculopathy-with-onset-in-infancy')],['MedlinePlus · STING1',med('gene/sting1')],['Liu et al. · activated STING and SAVI (NEJM 2014)','https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/']],community:nord},
 {gene:'FGF14',omim:'620174',id:'fgf14-sca27b-v1',title:'A repeated sequence in the genome',topic:'Repeat expansions',
  condition:'Spinocerebellar ataxia 27B',otherName:'Also called GAA-FGF14-related ataxia',inheritance:AD,
  clues:[['Location','A repeat within an intron','This round follows a DNA sequence outside the protein-coding region, within intron 1.'],['Function','Support neuronal electrical signals','The gene’s protein helps regulate the electrical activity of neurons. The relevant change is a DNA repeat expansion.']],
  geneBody:'Encodes fibroblast growth factor 14, an intracellular neuronal protein.',conditionBody:'An often adult-onset condition affecting coordination and balance.',
  variant:'A GAA trinucleotide repeat expansion in intron 1. Repeat size and structure matter.',
  nuance:'This is the SCA27B repeat-expansion association, distinct from other FGF14 conditions. Age at onset and penetrance vary; the illustration does not define diagnostic repeat thresholds.',
  summary:'A sequence can change by gaining repeat units rather than by changing a single base. In SCA27B, the relevant expansion is intronic.',
  sources:[['GeneReviews · GAA-FGF14-related ataxia','https://www.ncbi.nlm.nih.gov/books/NBK599589/'],['Pellerin et al. · NEJM 2023 repeat discovery','https://www.nejm.org/doi/10.1056/NEJMoa2207406'],['Rafehi et al. · AJHG 2023 repeat discovery','https://pubmed.ncbi.nlm.nih.gov/36493768/']],community:['SCA27b Ataxia Foundation','https://www.sca27b.org/']}
];

// Unambiguous product names are accepted and mapped back to the gene at completion.
const products={CLCN1:['ClC-1'],GJB2:['Cx26','connexin 26'],SLC29A3:['ENT3'],'RNU4-2':['U4','U4 snRNA'],CACNA1A:['CaV2.1'],PTPN11:['SHP-2'],RNU4ATAC:['U4atac'],STING1:['STING'],FGF14:['FHF4']};
const referenceNames={
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7235630/':'ClinGen Hearing Loss Expert Panel · GJB2 penetrance (2019)',
 'https://pubmed.ncbi.nlm.nih.gov/24172204/':'Molho-Pessach et al. · H syndrome clinical series (2014)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2561939/':'Molho-Pessach et al. · SLC29A3 and H syndrome (2008)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10697969/':'Ballios et al. · Roifman retinal phenotype and course (2023)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6230649/':'Hallermayr et al. · Roifman syndrome phenotype (2018)',
 'https://pubmed.ncbi.nlm.nih.gov/33569478/':'Wang et al. · lung-predominant SAVI (2021)',
 'https://pubmed.ncbi.nlm.nih.gov/23258413/':'Sun et al. · cGAS, cGAMP, and STING (2013)',
 'https://medlineplus.gov/genetics/understanding/inheritance/riskassessment/':'MedlinePlus Genetics · inheritance and recurrence',
 'https://www.ncbi.nlm.nih.gov/books/NBK1124/':'GeneReviews · Noonan syndrome',
 'https://www.nature.com/articles/s41591-024-03085-5':'Greene et al. · RNU4-2 phenotype and discovery (2024)',
 'https://www.nature.com/articles/s41588-026-02554-6':'RNU4-2 · distinct recessive association (2026)',
 'https://pubmed.ncbi.nlm.nih.gov/31468518/':'Jiang et al. · CACNA1A gain and loss of function (2019)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4613477/':'Damaj et al. · CACNA1A neurodevelopmental spectrum (2015)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9458680/':'Clinical and genetic characterization of CACNA1A-related disease (2022)',
 'https://pubmed.ncbi.nlm.nih.gov/24534818/':'Prendiville et al. · cardiac genotype–phenotype associations (2014)',
 'https://pubmed.ncbi.nlm.nih.gov/28951494/':'Warner et al. · vasculopathy independent of IRF3 in mice (2017)',
 'https://pubmed.ncbi.nlm.nih.gov/30772497/':'Luksch et al. · lung disease relies on T cells, not type I interferon (2019)',
 'https://pubmed.ncbi.nlm.nih.gov/22174130/':'Hsu et al. · ENT3 and lysosome function (Science 2012)',
 'https://pubmed.ncbi.nlm.nih.gov/9491886/':'Hof et al. · SHP-2 structure and autoinhibition (1998)',
 'https://pubmed.ncbi.nlm.nih.gov/16358218/':'Tartaglia et al. · functional consequences of PTPN11 variants (2006)',
 'https://pubmed.ncbi.nlm.nih.gov/23074130/':'Turunen et al. · splicing by the minor spliceosome (2013)',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10784672/':'Clinical and genetic keys to GAA-FGF14 ataxia'
};
const sourceNote='Original educational summary based on the linked references. OMIM links identify the condition; phenotype prose is paraphrased from the other cited sources. Illustrations are conceptual, not patient images or atomic structures. New conceptual artwork was generated with AI and simplified for learning.';
const reviewLabel=entry=>isApproved(entry)?`Scientifically reviewed${entry.reviewer?` · ${entry.reviewer}`:''}${entry.date?` · ${entry.date}`:''}`:'Pending scientific review';

export const allRounds=entries.map((r,index)=>{
 const number=String(index+1).padStart(2,'0'),clinical=clinicalProfiles[r.gene],illustration=illustrations[number];
 const sources=new Map([[`https://omim.org/entry/${r.omim}`,`OMIM · condition #${r.omim}`],...r.sources.map(([label,url])=>[url,label])]);
 if(!sources.has(illustration.source))sources.set(illustration.source,referenceNames[illustration.source]??'Illustration · mechanistic reference');
 if(illustration.noteSource&&!sources.has(illustration.noteSource))sources.set(illustration.noteSource,'Spliceosome · assembly and activation');
 const urls=[clinical.patternSource,...clinical.connectionSources,...[clinical.significance,clinical.family,clinical.interpretation].flatMap(claim=>claim.sources),...clinical.features.map(f=>f.source),...clinical.pearls.flatMap(p=>p.sources),...(clinical.extraSources??[])];
 for(const url of urls) if(!sources.has(url)) sources.set(url,referenceNames[url]??(url.includes('ncbi.nlm.nih.gov/books')?'GeneReviews · clinical and molecular reference':url.includes('medlineplus')?'MedlinePlus Genetics · clinical reference':'Primary research · clinical and molecular evidence'));
 for(const [label,url] of interpretationSources)if(!sources.has(url))sources.set(url,label);
 return {...r,number,clinical,illustration,signoff:signoff[r.id],reviewStatus:reviewLabel(signoff[r.id]),checked:'15 October 2026',sourceNote,
  aliases:r.aliases??[],products:products[r.gene]??[],ambiguousProducts:r.gene==='RNU4-2'?['U4','U4 snRNA']:[],
  artwork:`./artwork/${number}.webp${new URL(import.meta.url).search}`,description:illustration.description,pieces:illustration.pieces,
  sources:[...sources].map(([url,label])=>[label,url]),
  clues:[...r.clues.map(([label,title,body],i)=>({at:[2,4][i],label,title,body})),
   {at:6,label:'Clinical pattern',title:clinical.playPatternTitle,body:clinical.playPattern,sourceUrl:clinical.patternSource},
   {at:8,label:'Inheritance',title:r.inheritance,body:r.inheritance===AR?'Disease-causing variants affect both gene copies.':'A disease-causing variant in one gene copy can be sufficient.'},
   {at:11,label:'The gene',title:r.gene,body:r.geneBody},{at:12,label:'The condition',title:r.condition,body:r.conditionBody}]
 };
});

// With requireApproval, only rounds with complete sign-off are playable. Numbers and save keys stay stable.
export function publishedRounds(list,required=requireApproval){return required?list.filter(r=>isApproved(r.signoff)):list;}
export const rounds=publishedRounds(allRounds);
export function findRound(value,list=rounds) {return list.find(r=>r.number===value||r.id===value)??list[0];}
export const saveKey=round=>`gregor-puzzles:${round.id}`;

// Search covers the terminology a learner may know before learning a symbol.
export function searchText(round){
 const c=round.clinical;
 return [round.gene,...round.aliases,...round.products,round.condition,round.otherName,round.topic,round.inheritance,round.variant,c.pattern,c.overview,c.connection,c.onset,c.significance.text,c.family.text,c.interpretation.text,...c.pearls.flatMap(p=>[p.title,p.text]),...c.features.flatMap(f=>[f.title,f.system,f.text,f.context,f.hpo??'',hpoTerms[f.hpo]??''])].join(' ').toLowerCase();
}
