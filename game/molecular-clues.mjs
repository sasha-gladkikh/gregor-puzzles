// Association-specific educational summaries, not rules for classifying a variant.
// Sequence consequence and functional effect are deliberately separate. Frequency
// claims are limited to what the cited source supports; no patient data are used.
const books=id=>`https://www.ncbi.nlm.nih.gov/books/${id}/`;
const fact=(title,body,preview,...sourceUrl)=>({title,body,preview,sourceUrl});
const pair=(mechanism,variantType)=>({mechanism,variantType,checked:'20 October 2026'});

export const molecularSources=[
 ['Kang et al. · functional effects of disease-associated ENT3 variants (2010)','https://pmc.ncbi.nlm.nih.gov/articles/PMC2934698/']
];

export const molecularClues={
 CLCN1:pair(
  fact('Loss of function','Loss of function reduces chloride conductance, making muscle membranes more excitable and delaying relaxation.','Reduced chloride conductance makes muscle membranes more excitable.',books('NBK1355')),
  fact('Missense or truncating variants','Pathogenic missense variants change an amino acid; truncating variants can shorten the protein or reduce its production. For this recessive association, both gene copies are affected.','Pathogenic missense or truncating variants affect both gene copies in this recessive association.',books('NBK1355'))
 ),
 GJB2:pair(
  fact('Loss of function','Loss of function reduces channel assembly or activity, disrupting communication between neighboring inner-ear cells.','Reduced channel function disrupts communication between inner-ear cells.',books('NBK1272'),'https://medlineplus.gov/genetics/gene/gjb2/'),
  fact('Truncating and missense variants','Pathogenic changes include truncating and missense variants. The particular pair of variants can influence hearing severity.','Truncating and missense variants occur; the pair of variants can influence hearing severity.',books('NBK1272'))
 ),
 SLC29A3:pair(
  fact('Loss of transport function','Loss of function reduces or abolishes nucleoside transport. Some variants also alter the transporter’s location or stability.','Reduced nucleoside transport can accompany altered transporter location or stability.','https://pmc.ncbi.nlm.nih.gov/articles/PMC2934698/'),
  fact('Missense and truncating variants','Reported pathogenic changes include missense substitutions, frameshifts, and premature stop signals.','Reported changes include amino-acid substitutions, frameshifts, and premature stop signals.','https://pmc.ncbi.nlm.nih.gov/articles/PMC2934698/')
 ),
 SBDS:pair(
  fact('Reduced protein function','Reduced protein function leaves a blocker attached to the large ribosomal subunit, limiting formation of working ribosomes.','Reduced maturation-factor function limits formation of working ribosomes.',books('NBK1756'),'https://pubmed.ncbi.nlm.nih.gov/26479198/'),
  fact('Splice-site and stop-gain variants','Recurrent splice-site and stop-gain variants disrupt RNA processing or introduce an early stop. They often arise through gene conversion from a nearby pseudogene.','Recurrent splice-site and stop-gain variants often arise through pseudogene conversion.',books('NBK1756'))
 ),
 'RNU4-2':pair(
  fact('Altered RNA splicing','Changes in a functional RNA can alter where the spliceosome cuts an RNA message. The precise disease mechanism remains under investigation.','RNA splicing is altered; the precise disease mechanism remains under investigation.','https://www.nature.com/articles/s41586-026-10334-9'),
  fact('Noncoding substitutions and insertions','Reported noncoding substitutions and insertions cluster in a small region of a functional-RNA gene. A recurrent single-base insertion is particularly frequent.','Variants cluster in a functional-RNA gene; a recurrent single-base insertion is frequent.','https://www.nature.com/articles/s41586-026-10334-9')
 ),
 CACNA1A:pair(
  fact('Gain or loss of channel function','Gain of function and loss of function have both been reported: channel activity can increase or decrease, depending on the specific variant.','Channel activity can increase or decrease, depending on the specific variant.','https://pubmed.ncbi.nlm.nih.gov/31468518/'),
  fact('Missense variants','Reported missense variants change one amino acid in one gene copy. A missense change alone does not establish whether channel activity increases or decreases.','A missense change replaces one amino acid; its functional effect requires separate evidence.','https://pubmed.ncbi.nlm.nih.gov/31468518/')
 ),
 PTPN11:pair(
  fact('Gain of function','Gain of function increases a signaling regulator’s activity, strengthening growth and developmental signals.', 'Increased activity of a signaling regulator strengthens developmental signals.',books('NBK1124'),'https://pubmed.ncbi.nlm.nih.gov/16358218/'),
  fact('Usually missense variants','Typical pathogenic missense variants change one amino acid in one gene copy, altering the protein’s regulation.','Typical pathogenic variants replace one amino acid and alter protein regulation.',books('NBK1124'))
 ),
 RNU4ATAC:pair(
  fact('Partial loss of function','Partial loss of function in a functional RNA impairs minor-intron removal. Some RNA messages retain segments that should have been removed.','Partial loss of RNA function impairs removal of minor introns.',books('NBK589232'),'https://www.nature.com/articles/ncomms9718'),
  fact('Biallelic noncoding RNA variants','Reported noncoding RNA variants include single-base substitutions affecting both gene copies. They alter an RNA molecule rather than an amino-acid sequence.','Changes in both gene copies alter a functional RNA, not an amino-acid sequence.',books('NBK589232'),'https://www.nature.com/articles/ncomms9718')
 ),
 STING1:pair(
  fact('Gain of function','Gain of function allows an immune-signaling protein to remain active without its usual trigger, sustaining inflammatory signaling.','An immune-signaling protein can remain active without its usual trigger.','https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/'),
  fact('Heterozygous missense variants','Disease-associated missense variants replace an amino acid and increase signaling activity. One altered gene copy can be sufficient for this dominant association.','Disease-associated missense variants in one gene copy increase signaling.','https://pmc.ncbi.nlm.nih.gov/articles/PMC4174543/')
 ),
 FGF14:pair(
  fact('Likely loss of function','The repeat expansion is associated with reduced gene expression and protein levels, supporting loss of function as the likely disease mechanism.','Reduced expression and protein levels support a likely loss-of-function mechanism.',books('NBK599589'),'https://www.nejm.org/doi/10.1056/NEJMoa2207406'),
  fact('Intronic GAA repeat expansion','A GAA repeat expansion lengthens a three-letter DNA sequence within an intron, outside the protein-coding sequence. Repeat length and sequence composition both matter.','An intronic GAA repeat expands; both length and sequence composition matter.',books('NBK599589'))
 )
};
