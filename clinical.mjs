// Curated educational profiles. Public literature only; no patient-derived cases.
// HPO links standardize terminology; they do not assert an official disease annotation.
const gr=id=>`https://www.ncbi.nlm.nih.gov/books/${id}/`;
const med=path=>`https://medlineplus.gov/genetics/${path}/`;
const feature=(system,title,hpo,text,context,source,key=false)=>({system,title,hpo,text,context,source,key});
const question=(title,context,prompt,options,correct,rationales,source)=>({title,context,question:prompt,options,correct,rationales,explanation:rationales[correct],source});
const pearl=(title,text,source)=>({title,text,source});
const MC=gr('NBK1355'),GJ=gr('NBK1272'),SL=med('condition/histiocytosis-lymphadenopathy-plus-syndrome'),SD=gr('NBK1756'),RN=gr('NBK622730'),CA='https://pubmed.ncbi.nlm.nih.gov/31468518/',CAP='https://pmc.ncbi.nlm.nih.gov/articles/PMC4613477/',NO=gr('NBK1124'),RO=gr('NBK589232'),ROP='https://www.nature.com/articles/ncomms9718',ST=med('condition/sting-associated-vasculopathy-with-onset-in-infancy'),STP='https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/',FG=gr('NBK599589');
export const clinicalProfiles={
 CLCN1:{
  objective:'Distinguish delayed muscle relaxation from weakness, and interpret inheritance at the variant–condition level.',
  overview:'Childhood muscle stiffness with a warm-up effect suggests a skeletal muscle channelopathy. Transient weakness after rest adds an important clue to the recessive form.',
  onset:'Usually childhood; later presentation is possible. Stiffness fluctuates with activity and rest.',
  pattern:'Stiffness after rest that eases with repeated movement, together with transient weakness and muscular hypertrophy.',
  patternSource:MC,
  memory:'Relaxation is delayed; repetition can help. The recessive form may also cause transient weakness.',
  recall:['Which feature separates myotonia from weakness?','Myotonia is delayed relaxation after contraction; weakness is reduced force. Both may coexist.'],
  features:[
   feature('Muscle','Myotonia','HP:0002486','Delayed relaxation after contraction, sometimes evident after hand grip.','Core finding',MC,true),
   feature('Muscle','Warm-up phenomenon','HP:0003740','Repeated contractions can lessen stiffness.','Useful pattern; not unique to this condition',MC,true),
   feature('Muscle','Muscle hypertrophy','HP:0003712','Muscles may be enlarged despite impaired relaxation.','Variable expression',MC),
   feature('Muscle','Transient weakness','HP:0001324','Brief loss of force may occur when movement starts after rest.','Especially informative for the recessive form',MC,true),
   feature('Muscle','Myalgia','HP:0003326','Muscle pain can accompany stiffness.','Reported; severity differs',MC),
   feature('Muscle','Distal weakness','HP:0002460','Persistent weakness of distal muscles can occur.','Less typical than stiffness; not required',MC)
  ],
  pearls:[pearl('One gene, more than one inheritance pattern','CLCN1 has dominant and recessive associations. A single finding must be interpreted using the specific variant, zygosity, segregation, and phenotype.',med('gene/clcn1')),pearl('A useful differential','Myotonic dystrophy has a different molecular basis and may include systemic findings such as cataracts or cardiac conduction disease. Muscle stiffness alone does not distinguish these conditions.',MC)],
  questions:[
   question('Interpret the muscle pattern','Fictional teaching scenario: muscle stiffness improves after repeated hand opening.','Which physiological explanation best fits the delayed relaxation?',['Repetitive muscle-fiber firing caused by reduced stabilizing chloride conductance.','Progressive loss of motor neurons as the primary explanation for the warm-up effect.','Failure of acetylcholine release as the primary cause of prolonged muscle contraction.'],0,['Reduced chloride conductance favors muscle membrane hyperexcitability and repeated firing.','Motor-neuron loss primarily causes weakness and denervation; it does not explain this myotonic pattern.','Reduced transmitter release causes fatigable weakness, rather than this mechanism of delayed relaxation.'],med('condition/myotonia-congenita')),
   question('Interpret the allele, not just the gene','This round concerns the recessive relationship. A laboratory reports one heterozygous variant classified as pathogenic in that context.','Which interpretation is most defensible?',['The gene also has a dominant association, so this variant necessarily explains the symptoms.','The recessive diagnosis is not established; assess variant-specific evidence and whether a second allele was missed.','A warm-up effect proves that the second allele is pathogenic even if it has not been identified.'],1,['A dominant association does not make every pathogenic allele dominant.','For a recessive diagnosis, one identified allele is insufficient. Variant-specific dominant evidence and testing limitations also matter.','A suggestive phenotype is evidence for investigation, not proof of an unobserved pathogenic allele.'],MC)
  ]
 },
 GJB2:{
  objective:'Recognize the recessive nonsyndromic hearing profile and distinguish an informative negative finding from an exclusion rule.',
  overview:'The selected association primarily affects hearing. Severity, age at recognition, and progression vary; a passed newborn screen does not exclude a mild presentation.',
  onset:'Often congenital or prelingual. Mild hearing loss may be recognized later; some genotypes show progression.',
  pattern:'Bilateral sensorineural hearing loss, a variable audiologic course, and no expected syndromic skin findings in this recessive association.',patternSource:GJ,
  memory:'Nonsyndromic describes the associated findings, not a single severity or a guarantee of detection at birth.',
  recall:['Does a normal newborn hearing screen exclude this relationship?','No. Screening may miss mild hearing loss; interpretation includes the later audiologic phenotype.'],
  features:[
   feature('Hearing','Bilateral sensorineural hearing loss','HP:0008619','Hearing is affected through an inner-ear mechanism, typically in both ears.','Core finding',GJ,true),
   feature('Course','Variable severity',null,'The audiologic range extends from mild to profound.','Severity modifier, not an additional symptom',GJ,true),
   feature('Course','Congenital or early onset',null,'Early presentation is typical, but recognition may be delayed.','Age modifier; screening is not perfectly sensitive',GJ),
   feature('Course','Often stable, sometimes progressive',null,'Progression is possible and depends partly on genotype.','Do not assume stability for every individual',GJ),
   feature('Vestibular','Usually preserved vestibular function',null,'Vestibular dysfunction is not an expected defining feature.','Typical negative finding; not a stand-alone exclusion test',GJ),
   feature('Other systems','Nonsyndromic presentation',null,'Skin disease is not expected from this selected recessive association.','Other GJB2 associations can include skin involvement',med('gene/gjb2'),true)
  ],
  pearls:[pearl('Gene versus condition','Other GJB2 variants cause dominant or syndromic disorders. A gene-level search should not merge their skin findings into this recessive hearing profile.',med('gene/gjb2')),pearl('Testing context','Some DFNB1-region deletions affect regulatory elements needed for GJB2 expression. Finding one coding allele may justify reviewing the assay’s coverage and deletion analysis.',GJ)],
  questions:[
   question('Read the audiologic pattern','Fictional teaching scenario: a child has mild bilateral sensorineural hearing loss after passing newborn screening.','Which conclusion is best supported?',['Use the passed screen to favor an acquired cause over a congenital one.','Classify the later hearing loss as conductive until a repeat screen fails.','Retain a congenital genetic explanation because mild loss may escape screening.'],2,['A passed screen is not sufficient to distinguish acquired from mild congenital hearing loss.','Audiologic assessment, not screening history, distinguishes sensorineural from conductive loss.','Mild loss may be missed at screening. Later audiology and molecular evidence remain relevant.'],GJ),
   question('Interpret an unexpected feature','A hypothetical individual has hearing loss and marked palmoplantar keratoderma.','What should change in the interpretation?',['Review a syndromic allele or another diagnosis instead of importing skin findings into the selected recessive relationship.','Add keratoderma as a cardinal feature of all recessive cases.','Use the skin finding to classify any rare variant in the gene as pathogenic.'],0,['Syndromic and nonsyndromic associations must be distinguished at the allele and condition level.','Skin manifestations from other associations should not be generalized to this recessive condition.','Phenotype fit can support interpretation, but does not by itself establish variant pathogenicity.'],med('gene/gjb2'))
  ]
 },
 SLC29A3:{
  objective:'Recognize a variable histiocytosis spectrum and avoid treating its historical syndrome labels as mutually exclusive.',
  overview:'Pigmented, hairy skin lesions can accompany histiocytosis, lymphadenopathy, and endocrine or hearing findings. Different combinations were historically assigned separate syndrome names.',
  onset:'Presentation varies with the component features and can evolve over childhood and later life.',
  pattern:'Hyperpigmentation with hypertrichosis, histiocytosis or lymphadenopathy, and possible insulin-dependent diabetes or hearing loss.',patternSource:SL,
  memory:'Skin, histiocytes, and endocrine or hearing findings can belong to one variable spectrum.',
  recall:['Does absence of diabetes exclude the spectrum?','No. Diabetes occurs in part of the spectrum; the clinical combination varies, including within families.'],
  features:[
   feature('Skin','Hyperpigmented patches','HP:0000953','Areas of increased pigmentation may accompany tissue infiltration.','Particularly characteristic of H-syndrome presentations',SL,true),
   feature('Skin','Hypertrichosis','HP:0000998','Increased hair growth can overlie affected skin.','Interpret together with the pigmentation',SL,true),
   feature('Immune','Histiocytosis','HP:0100727','Histiocytes accumulate in tissues.','Shared feature across the spectrum',SL,true),
   feature('Lymphatic','Lymphadenopathy','HP:0002716','Nodes may enlarge because of histiocytic accumulation.','Distribution and extent vary',SL),
   feature('Endocrine','Insulin-dependent diabetes','HP:0000819','Diabetes is an important component of some presentations.','Not required in every phenotype',SL),
   feature('Hearing','Hearing loss','HP:0000407','Sensorineural hearing impairment has been described.','Variable associated finding',SL),
   feature('Musculoskeletal','Finger or toe contractures','HP:0034392','Restricted joint movement may accompany systemic findings.','Reported in the spectrum',SL)
  ],
  pearls:[pearl('Unifying historical diagnoses','H syndrome, PHID, Faisalabad histiocytosis, and familial Rosai-Dorfman disease overlap within the SLC29A3 spectrum.',SL),pearl('Mechanism has an evidence boundary','ENT3 supports intracellular nucleoside handling. How altered transport produces every clinical feature is not fully resolved; the diagram is not a proven linear pathway to all symptoms.',med('gene/slc29a3'))],
  questions:[
   question('Recognize a spectrum','Fictional teaching scenario: siblings share pigmented hairy skin lesions, but only one has diabetes.','Which interpretation best fits a variable multisystem disorder?',['The absence of diabetes necessarily excludes the same molecular diagnosis.','The siblings may share a molecular diagnosis despite different component features.','The diabetic sibling must have an unrelated second disorder.'],1,['A variable component cannot be treated as a universal diagnostic requirement.','The component findings can differ within families; the whole pattern and molecular evidence matter.','A second diagnosis is possible in principle, but discordant diabetes alone does not require one.'],SL),
   question('Separate evidence from a hypothesis','A transporter participates in nucleoside movement across intracellular membranes.','Which statement stays within the evidence?',['Altered nucleoside handling is relevant, but the complete route to every organ manifestation remains uncertain.','The localization alone proves the cellular cause of diabetes.','Histiocytosis shows that the transporter is an extracellular growth-factor receptor.'],0,['The transport defect and disease association are established; the full phenotype mechanism remains under study.','Subcellular localization does not establish a complete disease pathway for an individual manifestation.','The phenotype does not redefine the protein’s molecular function as a growth-factor receptor.'],med('gene/slc29a3'))
  ]
 },
 SBDS:{
  objective:'Connect pancreatic and marrow findings to ribosome maturation, then recognize the molecular testing complication from a homologous pseudogene.',
  overview:'Exocrine pancreatic dysfunction plus cytopenias is the central clinical connection. Growth and skeletal findings broaden the pattern; myeloid malignancy predisposition is an important part of the natural history.',
  onset:'Often recognized in infancy or childhood. Pancreatic manifestations can improve with age while hematologic risks persist.',
  pattern:'Exocrine pancreatic insufficiency with neutropenia or other cytopenias, short stature, and skeletal abnormalities.',patternSource:SD,
  memory:'Pancreas plus marrow suggests a ribosome problem; the pseudogene complicates the molecular readout.',
  recall:['Why is improving digestion not equivalent to resolution of the disorder?','The hematologic manifestations and predisposition to marrow complications remain relevant independently of pancreatic improvement.'],
  features:[
   feature('Pancreas','Exocrine pancreatic insufficiency','HP:0001738','Reduced digestive enzyme production can cause malabsorption.','Core feature; may become less apparent with age',SD,true),
   feature('Blood','Neutropenia','HP:0001875','Neutrophil counts may be persistently or intermittently reduced.','Core hematologic clue',SD,true),
   feature('Blood','Anemia','HP:0001903','Red-cell production may be affected along with other marrow lineages.','Variable cytopenia',med('condition/shwachman-diamond-syndrome')),
   feature('Blood','Thrombocytopenia','HP:0001873','Low platelets may accompany marrow dysfunction.','Variable cytopenia',med('condition/shwachman-diamond-syndrome')),
   feature('Growth','Short stature','HP:0004322','Growth can be affected by nutritional and intrinsic factors.','Commonly described, variable severity',SD),
   feature('Skeleton','Metaphyseal dysplasia','HP:0100255','Abnormal development of the ends of long bones can be part of the skeletal phenotype.','Useful associated finding',SD,true)
  ],
  pearls:[pearl('Natural history matters','Marrow failure and predisposition to myelodysplastic syndrome or acute myeloid leukemia are clinically important. They are risks, not inevitable outcomes.',med('condition/shwachman-diamond-syndrome')),pearl('Pseudogene-aware analysis','Gene conversion from the homologous pseudogene can introduce pathogenic sequence into SBDS. Mapping, allele assignment, and phase require attention during analysis.',SD)],
  questions:[
   question('Connect two organ systems','Fictional teaching scenario: pancreatic enzyme deficiency occurs with persistent neutropenia and metaphyseal changes.','Which cellular process offers the best unifying explanation for this round?',['Impaired telomere maintenance as the specific function of the pictured factor.','A primary block in minor-intron splicing by the pictured factor.','Impaired maturation of the large ribosomal subunit.'],2,['Telomere disorders can affect marrow, but telomere maintenance is not the function illustrated here.','Minor-spliceosome disease can be multisystemic, but this figure shows ribosome maturation.','This ribosomopathy connects pancreatic dysfunction, marrow abnormalities, and skeletal findings.'],med('gene/sbds')),
   question('Recognize a sequencing pitfall','Two candidate sequence changes lie in a region highly similar to a nearby pseudogene.','What is the most informative next analytical concern?',['Verify locus-specific assignment and whether the changes affect the two alleles in trans.','Count the two changes as two affected alleles without checking phase.','Discard both because a similar sequence is present in a pseudogene.'],0,['Gene conversion and sequence homology require careful locus assignment and phase assessment for a recessive interpretation.','Two changes may be in cis on one allele; variant count is not allele count.','Pseudogene similarity can create analytical difficulty and can also be biologically relevant to pathogenic gene conversion.'],SD)
  ]
 },
 'RNU4-2':{
  objective:'Recognize a neurodevelopmental phenotype associated with functional RNA and explain why coding-focused analysis can miss its cause.',
  overview:'Developmental disability with neonatal hypotonia, microcephaly, feeding difficulty, and variable epilepsy is a useful pattern. This round concerns the dominant ReNU association.',
  onset:'Usually infancy or childhood. Severity and associated neurologic, growth, and feeding findings vary.',
  pattern:'Developmental delay with neonatal hypotonia, microcephaly, feeding difficulties, and sometimes epilepsy.',patternSource:RN,
  memory:'Noncoding does not mean nonfunctional: the RNA is part of the splicing machinery.',
  recall:['Why can protein-only variant prioritization miss this condition?','The disease-associated sequence is transcribed into a functional small nuclear RNA, rather than translated into a protein.'],
  features:[
   feature('Development','Global developmental delay','HP:0001263','Multiple developmental domains are affected; intellectual disability may be evident with age.','Core neurodevelopmental finding',RN,true),
   feature('Neurologic','Neonatal hypotonia','HP:0001319','Low muscle tone can be apparent early in life.','Frequently described',RN),
   feature('Growth','Microcephaly','HP:0000252','Head circumference may be below the expected range.','Useful associated clue; not universal','https://www.nature.com/articles/s41591-024-03085-5',true),
   feature('Feeding','Infant feeding difficulties','HP:0008872','Feeding and weight gain may require support.','Variable early manifestation',RN,true),
   feature('Neurologic','Seizures','HP:0001250','Epilepsy occurs in a subset, with differing seizure types.','Not required for the diagnosis','https://www.nature.com/articles/s41591-024-03085-5'),
   feature('Communication','Speech and language delay','HP:0000750','Expressive communication may be substantially affected.','Support needs vary',RN),
   feature('Growth','Short stature','HP:0004322','Linear growth may be reduced.','Variable associated finding','https://www.nature.com/articles/s41591-024-03085-5')
  ],
  pearls:[pearl('Mechanism beyond the coding genome','Dominant ReNU variants affect a constrained region of U4 RNA involved in major-spliceosome function. A normal protein consequence annotation does not imply a benign RNA effect.','https://www.nature.com/articles/s41586-024-07773-7'),pearl('Do not merge the recessive association','Biallelic RNU4-2 variants have a separately described recessive neurodevelopmental association. Its findings and mechanism should not be pooled indiscriminately with dominant ReNU.','https://www.nature.com/articles/s41588-026-02554-6')],
  questions:[
   question('Interpret the noncoding genome','A hypothetical variant lies within a small nuclear RNA rather than an exon that encodes protein.','Which result would best support the proposed splicing mechanism?',['An amino-acid substitution prediction alone.','Evidence of altered RNA processing or splice-site usage consistent with the RNA’s function.','Absence of the variant from the protein annotation, treated as evidence of benignity.'],1,['Amino-acid predictions do not directly assess a functional noncoding RNA.','Evidence of altered splicing connects the RNA variant to the relevant cellular process; other pathogenicity evidence is still needed.','A missing protein consequence is expected for a noncoding RNA and does not establish benignity.'],'https://www.nature.com/articles/s41586-024-07773-7'),
   question('Reconsider a negative exome','Fictional teaching scenario: a child has developmental disability, hypotonia, microcephaly, and nondiagnostic coding-focused testing.','Which limitation is particularly relevant to this round?',['Protein consequence prediction may have underestimated a translated U4 protein.','Restricting reanalysis to synonymous coding variants is sufficient to assess U4 RNA.','Noncoding functional RNA loci may not have been adequately captured or analyzed.'],2,['U4 is a functional RNA; there is no translated U4 protein whose amino-acid consequence explains this association.','Synonymous coding variants do not cover the separate noncoding small-nuclear-RNA locus.','A functional RNA locus may fall outside coding capture or prioritization. The assay’s actual coverage and analysis scope matter.'],'https://www.nature.com/articles/s41586-024-07773-7')
  ]
 },
 CACNA1A:{
  objective:'Distinguish a gene’s broad phenotypic spectrum from a specific encephalopathy association and avoid inferring functional direction from the gene name.',
  overview:'Developmental impairment and epilepsy define the selected association. Hypotonia and cerebellar signs can add support, but their absence does not exclude a neurodevelopmental presentation.',
  onset:'Developmental and epileptic presentations often begin early. Seizure type, course, and cerebellar involvement vary.',
  pattern:'Developmental impairment with epilepsy, sometimes accompanied by hypotonia, ataxia, or abnormal eye movements.',patternSource:CAP,
  memory:'The gene identifies a channel; the specific variant determines how that channel is disturbed.',
  recall:['Does this encephalopathy imply that the calcium channel is always overactive?','No. Both gain and loss of function have been reported; functional direction needs variant-specific evidence.'],
  features:[
   feature('Neurologic','Seizures','HP:0001250','Seizure types and severity vary; some presentations include severe epilepsy.','Defining component of the selected association',CA,true),
   feature('Development','Global developmental delay','HP:0001263','Motor, language, and other developmental domains may be affected.','Core finding',CAP,true),
   feature('Cognition','Intellectual disability','HP:0001249','Cognitive impairment may be evident as development progresses.','Overlaps the developmental domain; not an independent diagnostic count',CAP),
   feature('Neuromuscular','Hypotonia','HP:0001252','Reduced muscle tone may accompany the neurodevelopmental presentation.','Variable','https://pmc.ncbi.nlm.nih.gov/articles/PMC9458680/'),
   feature('Cerebellar','Ataxia','HP:0001251','Coordination difficulties can occur, including episodic features.','May be subtle or absent',CAP,true),
   feature('Eye movements','Nystagmus','HP:0000639','Involuntary eye movements can provide a cerebellar clue.','Not obligatory in DEE; reported in the broader overlapping spectrum',CAP)
  ],
  pearls:[pearl('Variant-specific mechanism','Both increased and decreased channel function have been reported in severe developmental epileptic encephalopathies. Functional direction cannot be read from the gene symbol alone.',CA),pearl('Keep associations distinct','Episodic ataxia, familial hemiplegic migraine, and spinocerebellar ataxia 6 are other CACNA1A associations. Their defining findings or repeat mechanism should not be assigned to every DEE42 presentation.',med('gene/cacna1a'))],
  questions:[
   question('Separate gene identity from functional direction','A rare missense variant is identified in the neuronal calcium channel represented here.','What establishes whether it increases or decreases channel function?',['Variant-specific evidence, ideally including appropriately interpreted functional studies.','The channel gene name alone establishes gain of function.','Any missense change necessarily causes loss of function.'],0,['Variant-specific effects matter; both functional directions have been reported in severe encephalopathy.','The same gene can harbor variants with different functional effects.','Missense is a sequence consequence, not a reliable functional-direction label.'],CA),
   question('Interpret an incomplete clinical match','Fictional teaching scenario: a child has developmental impairment and epilepsy, without obvious ataxia.','Which interpretation best fits the evidence?',['Absence of ataxia excludes a calcium-channel disorder.','The neurologic presentation remains compatible; cerebellar signs need not dominate.','The absence of ataxia establishes that a rare variant is pathogenic.'],1,['Prominent ataxia is not required for all neurodevelopmental presentations in this spectrum.','Neurodevelopmental and epileptic presentations may have mild or absent obvious cerebellar signs; molecular evidence is still required.','Compatibility is not proof of causality. Variant evidence and alternative explanations remain important.'],CAP)
  ]
 },
 PTPN11:{
  objective:'Recognize a Noonan phenotype and interpret gene-specific cardiac associations without turning them into exclusion rules.',
  overview:'Short stature, pulmonary valve stenosis, chest shape differences, and bleeding tendency form a useful pattern. Several RAS/MAPK genes cause overlapping phenotypes.',
  onset:'Congenital findings may prompt recognition in infancy; growth, developmental, or bleeding features may become clearer later.',
  pattern:'Pulmonary valve stenosis with short stature, pectus changes, and a bleeding tendency.',patternSource:NO,
  memory:'A RASopathy is a pathway diagnosis; the gene and allele refine the phenotype and mechanism.',
  recall:['Does every Noonan-associated gene carry the same cardiac profile?','No. Gene-specific associations shift the pattern, but they do not make a clinical feature mandatory or impossible.'],
  features:[
   feature('Cardiac','Pulmonary valve stenosis','HP:0001642','Narrowing at the pulmonary valve is a particularly informative cardiac feature.','Enriched in PTPN11-related Noonan syndrome',NO,true),
   feature('Growth','Short stature','HP:0004322','Linear growth may be below the expected range.','Variable, not obligatory',NO,true),
   feature('Chest','Pectus abnormality','HP:0000767','A depressed lower chest may occur with an upper chest prominence.','HPO link represents the excavatum component',NO),
   feature('Hematologic','Bleeding tendency','HP:0001892','Coagulation or platelet abnormalities can contribute to bruising or bleeding.','Variable; clinical history matters',NO,true),
   feature('Genitourinary','Cryptorchidism','HP:0000028','Undescended testes may occur in affected males.','Sex-specific associated feature',med('condition/noonan-syndrome')),
   feature('Development','Learning or language difficulties','HP:0000750','Language and educational support needs differ among individuals.','Intellectual disability is not universal',med('condition/noonan-syndrome')),
   feature('Lymphatic','Lymphatic dysplasia','HP:0100766','Abnormal lymphatic development can cause fluid accumulation.','Spectrum feature; not specific to PTPN11',NO)
  ],
  pearls:[pearl('Cardiac enrichment is not a rule','Pulmonary stenosis is associated with PTPN11-related Noonan syndrome; hypertrophic cardiomyopathy is less frequent than in some other Noonan gene groups. Neither observation is an absolute rule.','https://pubmed.ncbi.nlm.nih.gov/24534818/'),pearl('Allelic context','PTPN11 also has other associations, including Noonan syndrome with multiple lentigines and hematologic disease. Do not transfer the same mechanistic explanation to every allele.',med('gene/ptpn11'))],
  questions:[
   question('Read a gene–phenotype correlation','A RASopathy cohort shows different cardiac profiles across causative genes.','How should an enriched association such as pulmonary valve stenosis be used?',['As proof of one gene regardless of molecular findings.','As evidence that cardiomyopathy cannot occur with that gene.','As a prioritization clue, interpreted alongside the whole phenotype and molecular evidence.'],2,['An enriched feature is not specific enough to prove the gene.','Lower frequency is not absence; enrichment must not become an exclusion rule.','Gene–phenotype correlations refine interpretation without making a single finding diagnostic.'],'https://pubmed.ncbi.nlm.nih.gov/24534818/'),
   question('Interpret a signaling allele','A rare variant is found in a signaling regulator with several disease associations.','What is the strongest interpretation strategy?',['Evaluate the specific allele’s mechanism, associated condition, and clinical fit.','Assign the same gain-of-function mechanism to every variant in the gene.','Assume a recessive mechanism whenever family history is negative.'],0,['Allele-specific mechanism and phenotype distinguish overlapping associations of this signaling gene.','Different alleles and associations need not share the same functional behavior.','A negative family history does not establish recessive inheritance; a dominant variant may arise de novo.'],med('gene/ptpn11'))
  ]
 },
 RNU4ATAC:{
  objective:'Connect skeletal, immune, and retinal findings to minor-spliceosome dysfunction while distinguishing Roifman syndrome within a broader allelic spectrum.',
  overview:'The combination of spondyloepiphyseal dysplasia, impaired antibody responses, and retinal dystrophy is more informative than developmental delay alone. Growth restriction adds context.',
  onset:'Growth and skeletal findings can be early; immune and retinal manifestations may become apparent at different ages.',
  pattern:'Spondyloepiphyseal dysplasia plus antibody deficiency and retinal dystrophy, with growth restriction.',patternSource:ROP,
  memory:'Skeleton, antibodies, retina: connect three systems to the minor spliceosome.',
  recall:['What makes this pattern more informative than developmental delay alone?','The combination across skeleton, antibody function, and retina narrows the biological connection; none of the findings alone establishes a diagnosis.'],
  features:[
   feature('Skeleton','Spondyloepiphyseal dysplasia','HP:0002655','Vertebral and epiphyseal development is affected.','Characteristic pattern',ROP,true),
   feature('Immune','Deficient specific antibody response','HP:0005424','Antibody responses to tested antigens were absent in the original series, despite variable total immunoglobulin levels.','Original six-person series; assess the individual immune phenotype',ROP,true),
   feature('Vision','Retinal dystrophy','HP:0000556','Retinal degeneration can affect vision.','Useful multisystem clue; timing varies',ROP,true),
   feature('Growth','Prenatal growth restriction','HP:0001511','Reduced growth can begin before birth.','Reported in the Roifman phenotype',ROP),
   feature('Growth','Short stature','HP:0004322','Growth restriction may persist after birth.','Extent varies',RO),
   feature('Development','Developmental delay','HP:0001263','Developmental and learning needs vary.','Supportive but nonspecific',RO)
  ],
  pearls:[pearl('The RNA is the functional product','RNU4ATAC encodes U4atac RNA in the minor spliceosome. Disrupted processing of minor introns can affect many downstream transcripts.',ROP),pearl('One gene, a spectrum of conditions','Roifman syndrome, MOPD I, and Lowry-Wood syndrome fall within RNU4atac-opathy. Historical labels describe patterns with overlap; this round specifically teaches Roifman syndrome.',RO)],
  questions:[
   question('Look beyond total immunoglobulins','Fictional teaching scenario: skeletal dysplasia, retinal dystrophy, and infections occur despite immunoglobulin levels within the laboratory range.','Which finding would most directly support the immune component of this pattern?',['An isolated reduction in T-cell number with preserved antibody responses.','Impaired antigen-specific antibody responses despite preserved total immunoglobulin levels.','A high total immunoglobulin level alone, without assessment of antigen-specific responses.'],1,['The original Roifman series had normal T-cell number and function; impaired specific antibody production was the defining immune observation.','Total concentration and antigen-specific function are different measurements. In the original series, specific antibody responses were absent despite variable total immunoglobulins.','Total concentration alone does not demonstrate effective antigen-specific antibody responses.'],ROP),
   question('Connect a functional RNA to many tissues','The diagram highlights processing of a specialized class of introns.','Which experimental observation would most directly support the proposed mechanism?',['Reduced abundance of a downstream transcript without demonstrating altered splicing.','Selective major-intron retention with preserved minor-intron processing.','Increased retention of minor introns in affected transcripts.'],2,['Reduced abundance may be a downstream effect, but alone does not identify the splicing defect.','This points to a different RNA-processing pattern; the proposed defect concerns minor introns.','Minor-intron retention directly connects impaired minor-spliceosome function to transcript processing.'],ROP)
  ]
 },
 STING1:{
  objective:'Recognize an inflammatory skin–lung pattern and distinguish excessive innate immune signaling from a simple loss of immune function.',
  overview:'Early inflammatory disease involving acral skin and lungs is a useful pattern. Severity and organ involvement differ, and the selected relationship is a dominant gain-of-function association.',
  onset:'Often begins in infancy. Skin and pulmonary findings can develop differently across individuals.',
  pattern:'Cold-sensitive acral skin lesions, recurrent fever, and interstitial lung involvement.',patternSource:ST,
  memory:'Skin plus lung inflammation can reflect a signal that stays active, not an immune response that is absent.',
  recall:['Does a gene’s role in immunity mean that its disease mechanism must be loss of function?','No. In the selected relationship, increased signaling drives an autoinflammatory interferonopathy.'],
  features:[
   feature('Skin','Acral skin ulceration','HP:0200042','Inflammatory lesions can affect fingers, toes, ears, or nose and may ulcerate.','Useful distribution; may worsen with cold',ST,true),
   feature('Skin','Livedo reticularis','HP:0033505','A net-like violaceous discoloration can reflect small-vessel involvement.','Variable associated finding',ST),
   feature('Lung','Interstitial lung disease','HP:0006530','Inflammation and damage can affect pulmonary interstitial tissue.','Important organ involvement; HPO link is the broader morphology term',STP,true),
   feature('Systemic','Recurrent fever','HP:0001954','Episodes of fever can accompany systemic inflammation.','Reported early manifestation',STP,true),
   feature('Growth','Poor weight gain','HP:0001508','Chronic inflammatory disease can be associated with growth difficulties.','Variable; HPO label is “Failure to thrive”',STP),
   feature('Lymphatic','Lymphadenopathy','HP:0002716','Enlarged lymph nodes can accompany inflammation.','Variable associated finding',ST)
  ],
  pearls:[pearl('Interferonopathy is a mechanistic category','Excessive signaling through STING can increase type I interferon activity. This explains why an immune gene may cause autoinflammation rather than a simple absence of immune responses.',STP),pearl('A molecular signature is supporting evidence','An interferon-stimulated gene signature supports pathway activation but is not uniquely diagnostic of this condition. The variant and clinical context still matter.',STP)],
  questions:[
   question('Interpret the direction of immune dysfunction','Fictional teaching scenario: early skin vasculopathy and lung inflammation accompany an activating signaling variant.','Which mechanism best fits the selected relationship?',['Persistent innate immune signaling with excess type I interferon activity.','A selective antibody-production defect as the primary pathway abnormality.','A complement-mediated immune-complex mechanism established by the skin distribution alone.'],0,['An activating signaling defect can produce systemic autoinflammation and a skin–lung phenotype.','Antibody deficiency does not explain this activating interferon-pathway mechanism.','The skin distribution alone does not establish an immune-complex mechanism; the activating variant and signaling evidence point to an interferonopathy.'],STP),
   question('Interpret a pathway biomarker','A hypothetical sample shows increased expression of interferon-stimulated genes.','What does that result establish?',['It proves the identity of the causative gene without sequencing.','It supports interferon-pathway activation but does not uniquely identify this disorder.','It demonstrates that the causal variant must reduce signaling.'],1,['Different genetic and acquired contexts can activate interferon pathways; the signal is not gene-specific.','The biomarker supports a mechanism. Clinical and variant-level evidence are still required to identify the cause.','Increased pathway activity does not establish a loss-of-function mechanism for the candidate gene.'],STP)
  ]
 },
 FGF14:{
  objective:'Recognize a late-onset episodic-to-progressive ataxia pattern and explain why a repeat expansion can escape standard exome analysis.',
  overview:'Gait ataxia, episodic symptoms, and downbeat nystagmus are a useful combination. The selected association is an intronic repeat expansion, distinct from other sequence variants in the same gene.',
  onset:'Typically adult onset, often in later adulthood. Episodic symptoms may precede persistent gait ataxia.',
  pattern:'Adult-onset gait ataxia with episodic imbalance or diplopia and downbeat nystagmus.',patternSource:FG,
  memory:'Think beyond exons: an intronic repeat can underlie a late-onset ataxia pattern.',
  recall:['Why is “exome negative” not “genetic cause excluded” here?','Standard exome analysis does not reliably characterize this intronic repeat expansion. Repeat size and sequence composition require suitable analysis.'],
  features:[
   feature('Cerebellar','Gait ataxia','HP:0002066','Walking becomes unsteady because of impaired coordination.','Core presentation',FG,true),
   feature('Course','Episodic ataxia','HP:0002131','Intermittent episodes can precede or accompany persistent symptoms.','Useful course feature',FG,true),
   feature('Eye movements','Downbeat nystagmus','HP:0010545','A downward fast phase of eye movement can be an informative clue.','Useful but not disease-specific',FG,true),
   feature('Vision','Diplopia','HP:0000651','Double vision may occur during episodes.','Variable episodic manifestation','https://www.nejm.org/doi/10.1056/NEJMoa2207406'),
   feature('Speech','Dysarthria','HP:0001260','Cerebellar involvement can affect articulation.','May be absent or mild, particularly early','https://pmc.ncbi.nlm.nih.gov/articles/PMC10784672/'),
   feature('Imaging','Cerebellar atrophy','HP:0001272','Imaging may show cerebellar volume loss.','Variable; imaging is not a molecular diagnosis',FG)
  ],
  pearls:[pearl('A testing blind spot','Standard exome sequencing does not reliably detect the relevant intronic GAA expansion. Repeat-focused methods assess size and composition; short-read predictions may require confirmation.',FG),pearl('Repeat architecture matters','Repeat length, purity, and penetrance affect interpretation. A long non-GAA repeat should not automatically be treated as equivalent to a pathogenic GAA expansion.',FG)],
  questions:[
   question('Choose the relevant variant class','Fictional teaching scenario: an adult has episodic imbalance, downbeat nystagmus, and progressive gait ataxia after a nondiagnostic exome.','Which unresolved mechanism is especially relevant to this round?',['A coding CAG expansion that lengthens a polyglutamine tract in this protein.','An intronic GAA expansion that requires repeat-aware analysis.','A dosage deletion that can be resolved by repeat sizing alone.'],1,['Other ataxias involve coding polyglutamine expansions; that is a different mechanism from this intronic GAA association.','An intronic GAA expansion may be missed by standard exome analysis; repeat-focused assessment is relevant.','Copy-number change and repeat expansion are different variant classes and require appropriate assays.'],FG),
   question('Interpret a repeat result','A screening tool suggests an expanded repeat at this locus.','What additional information is important before interpreting that finding?',['Repeat length alone, regardless of sequence composition or assay limits.','The protein’s amino-acid substitution score alone.','Repeat size, sequence composition, assay limitations, and the clinical context.'],2,['The motif and purity matter; not every long repeat has the same implication.','A protein substitution score does not assess an intronic repeat expansion.','Size and composition must be assessed with suitable methods and interpreted with phenotype and penetrance.'],FG)
  ]
 }
};
