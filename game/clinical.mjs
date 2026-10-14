// Curated educational profiles. Public literature only; no patient-derived cases.
// HPO links standardize terminology; they do not assert an official disease annotation.
const gr=id=>`https://www.ncbi.nlm.nih.gov/books/${id}/`;
const med=path=>`https://medlineplus.gov/genetics/${path}/`;
const feature=(system,title,hpo,text,context,source,key=false)=>({system,title,hpo,text,context,source,key});
const pearl=(title,text,...sources)=>({title,text,sources});
// The completion card shows patternTitle with the clinical pattern, the connection sentence,
// and pearls[caveat]. These additions are drafts pending scientific review like all content.
const MC=gr('NBK1355'),GJ=gr('NBK1272'),SL=med('condition/histiocytosis-lymphadenopathy-plus-syndrome'),SD=gr('NBK1756'),RN=gr('NBK622730'),CA='https://pubmed.ncbi.nlm.nih.gov/31468518/',CAP='https://pmc.ncbi.nlm.nih.gov/articles/PMC4613477/',NO=gr('NBK1124'),RO=gr('NBK589232'),ROP='https://www.nature.com/articles/ncomms9718',ST=med('condition/sting-associated-vasculopathy-with-onset-in-infancy'),STP='https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/',FG=gr('NBK599589');
export const clinicalProfiles={
 CLCN1:{
  objective:'Distinguish delayed muscle relaxation from weakness, and interpret inheritance at the variant–condition level.',
  overview:'Childhood muscle stiffness with a warm-up effect suggests a skeletal muscle channelopathy. Transient weakness after rest adds an important clue to the recessive form.',
  onset:'Usually childhood; later presentation is possible. Stiffness fluctuates with activity and rest.',
  pattern:'Stiffness after rest that eases with repeated movement, together with transient weakness and muscular hypertrophy.',
  patternSource:MC,
  memory:'Relaxation is delayed; repetition can help. The recessive form may also cause transient weakness.',
  patternTitle:'Stiffness that eases with movement',caveat:0,
  connection:'ClC-1 chloride conductance steadies the muscle membrane after each signal. With less of it, electrical activity can repeat after a contraction, so relaxation is delayed.',
  features:[
   feature('Muscle','Myotonia','HP:0002486','Delayed relaxation after contraction, sometimes evident after hand grip.','Core finding',MC,true),
   feature('Muscle','Warm-up phenomenon','HP:0003740','Repeated contractions can lessen stiffness.','Useful pattern; not unique to this condition',MC,true),
   feature('Muscle','Muscle hypertrophy','HP:0003712','Muscles may be enlarged despite impaired relaxation.','Variable expression',MC),
   feature('Muscle','Transient weakness','HP:0001324','Brief loss of force may occur when movement starts after rest.','Especially informative for the recessive form',MC,true),
   feature('Muscle','Myalgia','HP:0003326','Muscle pain can accompany stiffness.','Reported; severity differs',MC),
   feature('Muscle','Distal weakness','HP:0002460','Persistent weakness of distal muscles can occur.','Less typical than stiffness; not required',MC)
  ],
  pearls:[pearl('One gene, more than one inheritance pattern','CLCN1 has dominant and recessive associations. A single finding must be interpreted using the specific variant, zygosity, segregation, and phenotype.',med('gene/clcn1')),pearl('A useful differential','Myotonic dystrophy has a different molecular basis and may include systemic findings such as cataracts or cardiac conduction disease. Muscle stiffness alone does not distinguish these conditions.',MC)]
 },
 GJB2:{
  objective:'Recognize the recessive nonsyndromic hearing profile and distinguish an informative negative finding from an exclusion rule.',
  overview:'The selected association primarily affects hearing. Severity, age at recognition, and progression vary; a passed newborn screen does not exclude a mild presentation.',
  onset:'Often congenital or prelingual. Mild hearing loss may be recognized later; some genotypes show progression.',
  pattern:'Bilateral sensorineural hearing loss, a variable audiologic course, and no expected syndromic skin findings in this recessive association.',patternSource:GJ,
  memory:'Nonsyndromic describes the associated findings, not a single severity or a guarantee of detection at birth.',
  patternTitle:'Bilateral sensorineural hearing loss',caveat:1,
  connection:'Connexin 26 gap junctions let neighboring inner-ear cells share ions and small molecules. Loss of function in both copies disrupts this communication and affects hearing, without the skin findings of some other GJB2 variants.',
  features:[
   feature('Hearing','Bilateral sensorineural hearing loss','HP:0008619','Hearing is affected through an inner-ear mechanism, typically in both ears.','Core finding',GJ,true),
   feature('Course','Variable severity',null,'The audiologic range extends from mild to profound.','Severity modifier, not an additional symptom',GJ,true),
   feature('Course','Congenital or early onset',null,'Early presentation is typical, but recognition may be delayed.','Age modifier; screening is not perfectly sensitive',GJ),
   feature('Course','Often stable, sometimes progressive',null,'Progression is possible and depends partly on genotype.','Do not assume stability for every individual',GJ),
   feature('Vestibular','Usually preserved vestibular function',null,'Vestibular dysfunction is not an expected defining feature.','Typical negative finding; not a stand-alone exclusion test',GJ),
   feature('Other systems','Nonsyndromic presentation',null,'Skin disease is not expected from this selected recessive association.','Other GJB2 associations can include skin involvement',med('gene/gjb2'),true)
  ],
  pearls:[pearl('Gene versus condition','Other GJB2 variants cause dominant or syndromic disorders. A gene-level search should not merge their skin findings into this recessive hearing profile.',med('gene/gjb2')),pearl('Testing context','Some DFNB1-region deletions affect regulatory elements needed for GJB2 expression. Finding one coding allele may justify reviewing the assay’s coverage and deletion analysis.',GJ)]
 },
 SLC29A3:{
  objective:'Recognize a variable histiocytosis spectrum and avoid treating its historical syndrome labels as mutually exclusive.',
  overview:'Pigmented, hairy skin lesions can accompany histiocytosis, lymphadenopathy, and endocrine or hearing findings. Different combinations were historically assigned separate syndrome names.',
  onset:'Presentation varies with the component features and can evolve over childhood and later life.',
  pattern:'Hyperpigmentation with hypertrichosis, histiocytosis or lymphadenopathy, and possible insulin-dependent diabetes or hearing loss.',patternSource:SL,
  memory:'Skin, histiocytes, and endocrine or hearing findings can belong to one variable spectrum.',
  patternTitle:'Pigmented, hairy skin with histiocytosis',caveat:0,extraSources:['https://pubmed.ncbi.nlm.nih.gov/22174130/'],
  connection:'ENT3 carries nucleosides out of lysosomes for reuse. When it fails, lysosomal and cellular homeostasis are disturbed; how that produces each clinical feature is still being worked out.',
  features:[
   feature('Skin','Hyperpigmented patches','HP:0000953','Areas of increased pigmentation may accompany tissue infiltration.','Particularly characteristic of H-syndrome presentations',SL,true),
   feature('Skin','Hypertrichosis','HP:0000998','Increased hair growth can overlie affected skin.','Interpret together with the pigmentation',SL,true),
   feature('Immune','Histiocytosis','HP:0100727','Histiocytes accumulate in tissues.','Shared feature across the spectrum',SL,true),
   feature('Lymphatic','Lymphadenopathy','HP:0002716','Nodes may enlarge because of histiocytic accumulation.','Distribution and extent vary',SL),
   feature('Endocrine','Insulin-dependent diabetes','HP:0000819','Diabetes is an important component of some presentations.','Not required in every phenotype',SL),
   feature('Hearing','Hearing loss','HP:0000407','Sensorineural hearing impairment has been described.','Variable associated finding',SL),
   feature('Musculoskeletal','Finger or toe contractures','HP:0034392','Restricted joint movement may accompany systemic findings.','Reported in the spectrum',SL)
  ],
  pearls:[pearl('Unifying historical diagnoses','H syndrome, PHID, Faisalabad histiocytosis, and familial Rosai-Dorfman disease overlap within the SLC29A3 spectrum.',SL),pearl('Mechanism has an evidence boundary','ENT3 supports intracellular nucleoside handling. How altered transport produces every clinical feature is not fully resolved; the diagram is not a proven linear pathway to all symptoms.',med('gene/slc29a3'))]
 },
 SBDS:{
  objective:'Connect pancreatic and marrow findings to ribosome maturation, then recognize the molecular testing complication from a homologous pseudogene.',
  overview:'Exocrine pancreatic dysfunction plus cytopenias is the central clinical connection. Growth and skeletal findings broaden the pattern; myeloid malignancy predisposition is an important part of the natural history.',
  onset:'Often recognized in infancy or childhood. Pancreatic manifestations can improve with age while hematologic risks persist.',
  pattern:'Exocrine pancreatic insufficiency with neutropenia or other cytopenias, short stature, and skeletal abnormalities.',patternSource:SD,
  memory:'Pancreas plus marrow suggests a ribosome problem; the pseudogene complicates the molecular readout.',
  patternTitle:'Pancreatic insufficiency with cytopenias',caveat:1,
  connection:'SBDS and the GTPase EFL1 remove eIF6, a “do not join” tag on the large ribosomal subunit, so working ribosomes can form. Reduced SBDS function impairs this step; pancreatic and marrow findings are the central clinical connection.',
  features:[
   feature('Pancreas','Exocrine pancreatic insufficiency','HP:0001738','Reduced digestive enzyme production can cause malabsorption.','Core feature; may become less apparent with age',SD,true),
   feature('Blood','Neutropenia','HP:0001875','Neutrophil counts may be persistently or intermittently reduced.','Core hematologic clue',SD,true),
   feature('Blood','Anemia','HP:0001903','Red-cell production may be affected along with other marrow lineages.','Variable cytopenia',med('condition/shwachman-diamond-syndrome')),
   feature('Blood','Thrombocytopenia','HP:0001873','Low platelets may accompany marrow dysfunction.','Variable cytopenia',med('condition/shwachman-diamond-syndrome')),
   feature('Growth','Short stature','HP:0004322','Growth can be affected by nutritional and intrinsic factors.','Commonly described, variable severity',SD),
   feature('Skeleton','Metaphyseal dysplasia','HP:0100255','Abnormal development of the ends of long bones can be part of the skeletal phenotype.','Useful associated finding',SD,true)
  ],
  pearls:[pearl('Natural history matters','Marrow failure and predisposition to myelodysplastic syndrome or acute myeloid leukemia are clinically important. They are risks, not inevitable outcomes.',med('condition/shwachman-diamond-syndrome')),pearl('Pseudogene-aware analysis','Gene conversion from the homologous pseudogene can introduce pathogenic sequence into SBDS. Mapping, allele assignment, and phase require attention during analysis.',SD)]
 },
 'RNU4-2':{
  objective:'Recognize a neurodevelopmental phenotype associated with functional RNA and explain why coding-focused analysis can miss its cause.',
  overview:'Developmental disability with neonatal hypotonia, microcephaly, feeding difficulty, and variable epilepsy is a useful pattern. This round concerns the dominant ReNU association.',
  onset:'Usually infancy or childhood. Severity and associated neurologic, growth, and feeding findings vary.',
  pattern:'Developmental delay with neonatal hypotonia, microcephaly, feeding difficulties, and sometimes epilepsy.',patternSource:RN,
  memory:'Noncoding does not mean nonfunctional: the RNA is part of the splicing machinery.',
  patternTitle:'Developmental delay with early hypotonia',caveat:1,extraSources:['https://pubmed.ncbi.nlm.nih.gov/23074130/'],
  connection:'RNU4-2 makes U4, an RNA that pairs with U6 to hold it inactive while the spliceosome assembles; U4 is released before splicing chemistry begins. ReNU variants change this RNA, not a protein, so coding-focused analysis can miss them.',
  features:[
   feature('Development','Global developmental delay','HP:0001263','Multiple developmental domains are affected; intellectual disability may be evident with age.','Core neurodevelopmental finding',RN,true),
   feature('Neurologic','Neonatal hypotonia','HP:0001319','Low muscle tone can be apparent early in life.','Frequently described',RN),
   feature('Growth','Microcephaly','HP:0000252','Head circumference may be below the expected range.','Useful associated clue; not universal','https://www.nature.com/articles/s41591-024-03085-5',true),
   feature('Feeding','Infant feeding difficulties','HP:0008872','Feeding and weight gain may require support.','Variable early manifestation',RN,true),
   feature('Neurologic','Seizures','HP:0001250','Epilepsy occurs in a subset, with differing seizure types.','Not required for the diagnosis','https://www.nature.com/articles/s41591-024-03085-5'),
   feature('Communication','Speech and language delay','HP:0000750','Expressive communication may be substantially affected.','Support needs vary',RN),
   feature('Growth','Short stature','HP:0004322','Linear growth may be reduced.','Variable associated finding','https://www.nature.com/articles/s41591-024-03085-5')
  ],
  pearls:[pearl('Mechanism beyond the coding genome','Dominant ReNU variants affect a constrained region of U4 RNA involved in major-spliceosome function. A normal protein consequence annotation does not imply a benign RNA effect.','https://www.nature.com/articles/s41586-024-07773-7'),pearl('Do not merge the recessive association','Biallelic RNU4-2 variants have a separately described recessive neurodevelopmental association. Its findings and mechanism should not be pooled indiscriminately with dominant ReNU.','https://www.nature.com/articles/s41588-026-02554-6')]
 },
 CACNA1A:{
  objective:'Distinguish a gene’s broad phenotypic spectrum from a specific encephalopathy association and avoid inferring functional direction from the gene name.',
  overview:'Developmental impairment and epilepsy define the selected association. Hypotonia and cerebellar signs can add support, but their absence does not exclude a neurodevelopmental presentation.',
  onset:'Developmental and epileptic presentations often begin early. Seizure type, course, and cerebellar involvement vary.',
  pattern:'Developmental impairment with epilepsy, sometimes accompanied by hypotonia, ataxia, or abnormal eye movements.',patternSource:CAP,
  memory:'The gene identifies a channel; the specific variant determines how that channel is disturbed.',
  patternTitle:'Developmental impairment with epilepsy',caveat:1,
  connection:'CaV2.1 lets calcium into nerve terminals to trigger transmitter release. DEE42 variants can push channel activity up or down, so the gene alone does not reveal the direction of the change.',
  features:[
   feature('Neurologic','Seizures','HP:0001250','Seizure types and severity vary; some presentations include severe epilepsy.','Defining component of the selected association',CA,true),
   feature('Development','Global developmental delay','HP:0001263','Motor, language, and other developmental domains may be affected.','Core finding',CAP,true),
   feature('Cognition','Intellectual disability','HP:0001249','Cognitive impairment may be evident as development progresses.','Overlaps the developmental domain; not an independent diagnostic count',CAP),
   feature('Neuromuscular','Hypotonia','HP:0001252','Reduced muscle tone may accompany the neurodevelopmental presentation.','Variable','https://pmc.ncbi.nlm.nih.gov/articles/PMC9458680/'),
   feature('Cerebellar','Ataxia','HP:0001251','Coordination difficulties can occur, including episodic features.','May be subtle or absent',CAP,true),
   feature('Eye movements','Nystagmus','HP:0000639','Involuntary eye movements can provide a cerebellar clue.','Not obligatory in DEE; reported in the broader overlapping spectrum',CAP)
  ],
  pearls:[pearl('Variant-specific mechanism','Both increased and decreased channel function have been reported in severe developmental epileptic encephalopathies. Functional direction cannot be read from the gene symbol alone.',CA),pearl('Keep associations distinct','Episodic ataxia, familial hemiplegic migraine, and spinocerebellar ataxia 6 are other CACNA1A associations. Their defining findings or repeat mechanism should not be assigned to every DEE42 presentation.',med('gene/cacna1a'))]
 },
 PTPN11:{
  objective:'Recognize a Noonan phenotype and interpret gene-specific cardiac associations without turning them into exclusion rules.',
  overview:'Short stature, pulmonary valve stenosis, chest shape differences, and bleeding tendency form a useful pattern. Several RAS/MAPK genes cause overlapping phenotypes.',
  onset:'Congenital findings may prompt recognition in infancy; growth, developmental, or bleeding features may become clearer later.',
  pattern:'Pulmonary valve stenosis with short stature, pectus changes, and a bleeding tendency.',patternSource:NO,
  memory:'A RASopathy is a pathway diagnosis; the gene and allele refine the phenotype and mechanism.',
  patternTitle:'Pulmonary stenosis with short stature',caveat:1,extraSources:['https://pubmed.ncbi.nlm.nih.gov/9491886/','https://pubmed.ncbi.nlm.nih.gov/16358218/'],
  connection:'SHP-2 is a phosphatase that helps turn RAS/MAPK signaling up. At rest, one of its own domains blocks the active site; many Noonan-associated variants weaken that block and increase activity.',
  features:[
   feature('Cardiac','Pulmonary valve stenosis','HP:0001642','Narrowing at the pulmonary valve is a particularly informative cardiac feature.','Enriched in PTPN11-related Noonan syndrome',NO,true),
   feature('Growth','Short stature','HP:0004322','Linear growth may be below the expected range.','Variable, not obligatory',NO,true),
   feature('Chest','Pectus abnormality','HP:0000767','A depressed lower chest may occur with an upper chest prominence.','HPO link represents the excavatum component',NO),
   feature('Hematologic','Bleeding tendency','HP:0001892','Coagulation or platelet abnormalities can contribute to bruising or bleeding.','Variable; clinical history matters',NO,true),
   feature('Genitourinary','Cryptorchidism','HP:0000028','Undescended testes may occur in affected males.','Sex-specific associated feature',med('condition/noonan-syndrome')),
   feature('Development','Learning or language difficulties','HP:0000750','Language and educational support needs differ among individuals.','Intellectual disability is not universal',med('condition/noonan-syndrome')),
   feature('Lymphatic','Lymphatic dysplasia','HP:0100766','Abnormal lymphatic development can cause fluid accumulation.','Spectrum feature; not specific to PTPN11',NO)
  ],
  pearls:[pearl('Cardiac enrichment is not a rule','Pulmonary stenosis is associated with PTPN11-related Noonan syndrome; hypertrophic cardiomyopathy is less frequent than in some other Noonan gene groups. Neither observation is an absolute rule.','https://pubmed.ncbi.nlm.nih.gov/24534818/'),pearl('Allelic context','PTPN11 also has other associations, including Noonan syndrome with multiple lentigines and hematologic disease. Do not transfer the same mechanistic explanation to every allele.',med('gene/ptpn11'))]
 },
 RNU4ATAC:{
  objective:'Connect skeletal, immune, and retinal findings to minor-spliceosome dysfunction while distinguishing Roifman syndrome within a broader allelic spectrum.',
  overview:'The combination of spondyloepiphyseal dysplasia, impaired antibody responses, and retinal dystrophy is more informative than developmental delay alone. Growth restriction adds context.',
  onset:'Growth and skeletal findings can be early; immune and retinal manifestations may become apparent at different ages.',
  pattern:'Spondyloepiphyseal dysplasia plus antibody deficiency and retinal dystrophy, with growth restriction.',patternSource:ROP,
  memory:'Skeleton, antibodies, retina: connect three systems to the minor spliceosome.',
  patternTitle:'Skeleton, antibodies, and retina',caveat:1,extraSources:['https://pubmed.ncbi.nlm.nih.gov/23074130/'],
  connection:'U4atac does the U4 job in the minor spliceosome, which removes the rare minor-class introns. Biallelic variants impair that processing across many transcripts at once, consistent with findings in several organ systems.',
  features:[
   feature('Skeleton','Spondyloepiphyseal dysplasia','HP:0002655','Vertebral and epiphyseal development is affected.','Characteristic pattern',ROP,true),
   feature('Immune','Deficient specific antibody response','HP:0005424','Antibody responses to tested antigens were absent in the original series, despite variable total immunoglobulin levels.','Original six-person series; assess the individual immune phenotype',ROP,true),
   feature('Vision','Retinal dystrophy','HP:0000556','Retinal degeneration can affect vision.','Useful multisystem clue; timing varies',ROP,true),
   feature('Growth','Prenatal growth restriction','HP:0001511','Reduced growth can begin before birth.','Reported in the Roifman phenotype',ROP),
   feature('Growth','Short stature','HP:0004322','Growth restriction may persist after birth.','Extent varies',RO),
   feature('Development','Developmental delay','HP:0001263','Developmental and learning needs vary.','Supportive but nonspecific',RO)
  ],
  pearls:[pearl('The RNA is the functional product','RNU4ATAC encodes U4atac RNA in the minor spliceosome. Disrupted processing of minor introns can affect many downstream transcripts.',ROP),pearl('One gene, a spectrum of conditions','Roifman syndrome, MOPD I, and Lowry-Wood syndrome fall within RNU4atac-opathy. Historical labels describe patterns with overlap; this round specifically teaches Roifman syndrome.',RO)]
 },
 STING1:{
  objective:'Recognize an inflammatory skin–lung pattern and distinguish excessive innate immune signaling from a simple loss of immune function.',
  overview:'Early inflammatory disease involving acral skin and lungs is a useful pattern. Severity and organ involvement differ, and the selected relationship is a dominant gain-of-function association.',
  onset:'Often begins in infancy. Skin and pulmonary findings can develop differently across individuals.',
  pattern:'Cold-sensitive acral skin lesions, recurrent fever, and interstitial lung involvement.',patternSource:ST,
  memory:'Skin plus lung inflammation can reflect a signal that stays active, not an immune response that is absent.',
  patternTitle:'Acral skin lesions with lung disease',caveat:2,
  connection:'In the cGAS–STING pathway shown, cGAS detects DNA in the cytosol and makes cGAMP, which activates STING. SAVI variants activate STING without that trigger, sustaining type I interferon signaling and inflammation.',
  features:[
   feature('Skin','Acral skin ulceration','HP:0200042','Inflammatory lesions can affect fingers, toes, ears, or nose and may ulcerate.','Useful distribution; may worsen with cold',ST,true),
   feature('Skin','Livedo reticularis','HP:0033505','A net-like violaceous discoloration can reflect small-vessel involvement.','Variable associated finding',ST),
   feature('Lung','Interstitial lung disease','HP:0006530','Inflammation and damage can affect pulmonary interstitial tissue.','Important organ involvement; HPO link is the broader morphology term',STP,true),
   feature('Systemic','Recurrent fever','HP:0001954','Episodes of fever can accompany systemic inflammation.','Reported early manifestation',STP,true),
   feature('Growth','Poor weight gain','HP:0001508','Chronic inflammatory disease can be associated with growth difficulties.','Variable; HPO label is “Failure to thrive”',STP),
   feature('Lymphatic','Lymphadenopathy','HP:0002716','Enlarged lymph nodes can accompany inflammation.','Variable associated finding',ST)
  ],
  pearls:[pearl('Interferonopathy is a mechanistic category','Excessive signaling through STING can increase type I interferon activity. This explains why an immune gene may cause autoinflammation rather than a simple absence of immune responses.',STP),pearl('A molecular signature is supporting evidence','An interferon-stimulated gene signature supports pathway activation but is not uniquely diagnostic of this condition. The variant and clinical context still matter.',STP),pearl('Interferon is not the whole story','SAVI is grouped with the type I interferonopathies, and patients show an interferon signature. In mouse models, however, vasculopathy developed without IRF3, and lung disease depended on T cells rather than type I interferon. Interferon is central but may not explain every feature.','https://pubmed.ncbi.nlm.nih.gov/28951494/','https://pubmed.ncbi.nlm.nih.gov/30772497/')]
 },
 FGF14:{
  objective:'Recognize a late-onset episodic-to-progressive ataxia pattern and explain why a repeat expansion can escape standard exome analysis.',
  overview:'Gait ataxia, episodic symptoms, and downbeat nystagmus are a useful combination. The selected association is an intronic repeat expansion, distinct from other sequence variants in the same gene.',
  onset:'Typically adult onset, often in later adulthood. Episodic symptoms may precede persistent gait ataxia.',
  pattern:'Adult-onset gait ataxia with episodic imbalance or diplopia and downbeat nystagmus.',patternSource:FG,
  memory:'Think beyond exons: an intronic repeat can underlie a late-onset ataxia pattern.',
  patternTitle:'Late-onset ataxia with episodes',caveat:1,
  connection:'An expanded GAA repeat deep in intron 1 of FGF14 underlies this late-onset ataxia. The protein-coding sequence is unchanged, and standard exome sequencing does not reliably detect the expansion.',
  features:[
   feature('Cerebellar','Gait ataxia','HP:0002066','Walking becomes unsteady because of impaired coordination.','Core presentation',FG,true),
   feature('Course','Episodic ataxia','HP:0002131','Intermittent episodes can precede or accompany persistent symptoms.','Useful course feature',FG,true),
   feature('Eye movements','Downbeat nystagmus','HP:0010545','A downward fast phase of eye movement can be an informative clue.','Useful but not disease-specific',FG,true),
   feature('Vision','Diplopia','HP:0000651','Double vision may occur during episodes.','Variable episodic manifestation','https://www.nejm.org/doi/10.1056/NEJMoa2207406'),
   feature('Speech','Dysarthria','HP:0001260','Cerebellar involvement can affect articulation.','May be absent or mild, particularly early','https://pmc.ncbi.nlm.nih.gov/articles/PMC10784672/'),
   feature('Imaging','Cerebellar atrophy','HP:0001272','Imaging may show cerebellar volume loss.','Variable; imaging is not a molecular diagnosis',FG)
  ],
  pearls:[pearl('A testing blind spot','Standard exome sequencing does not reliably detect the relevant intronic GAA expansion. Repeat-focused methods assess size and composition; short-read predictions may require confirmation.',FG),pearl('Repeat architecture matters','Repeat length, purity, and penetrance affect interpretation. A long non-GAA repeat should not automatically be treated as equivalent to a pathogenic GAA expansion.',FG)]
 }
};
