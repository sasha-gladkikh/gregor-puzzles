// Requested hints add reasoning steps rather than repeat the unlocked clues.
// Both steps remain anonymous; only the separately requested symbol hint names
// a prefix. Claims reuse the mechanism and clinical references in each round.
export const geneHintConnections={
  CLCN1:{
    biology:'The blue structure has two separate pores. Teal chloride ions are its cargo, and the fibers beneath it identify skeletal muscle.',
    hint:'Connect stiffness to delayed relaxation: reduced chloride flow can let muscle electrical activity persist. Look for a muscle chloride-channel gene.'
  },
  GJB2:{
    biology:'The amber particles pass directly from one cell into its neighbor. This is a shared channel, not a signal released into the space between cells.',
    hint:'A gap junction connects the cells’ interiors. The relevant gene makes a connexin used by cells in the cochlea, the hearing organ of the inner ear.'
  },
  SLC29A3:{
    biology:'The amber cargo is smaller than the RNA fragments inside the compartment. The key task is returning these small recycling products to the rest of the cell.',
    hint:'SLC stands for solute carrier. Look for a carrier of nucleosides, building blocks released from DNA and RNA, across lysosomal membranes.'
  },
  SBDS:{
    biology:'Read the picture in order: remove the amber blocker, then allow the large blue and small teal subunits to join into protein-making machinery.',
    hint:'The relevant gene helps ribosomes mature. Pancreatic dysfunction together with low blood-cell counts provides the clinical connection.'
  },
  'RNU4-2':{
    biology:'The amber loop is removed from an RNA message, while the navy and teal segments join. Folded RNAs inside the blue complex are part of the machinery doing this work.',
    hint:'Look among the RNA genes. Its product helps assemble the major spliceosome, the system that processes most introns; the functional product is not a protein.'
  },
  CACNA1A:{
    biology:'Follow two different cargos: teal calcium enters the nerve ending, then amber chemical signals leave it. Calcium entry helps trigger the release step.',
    hint:'Look for the calcium-channel gene that builds the channel’s pore. Both increased and decreased channel activity can disturb neuronal communication.'
  },
  PTPN11:{
    biology:'The arrows trace a relay from the cell surface toward the nucleus. They show the flow of information, not a cargo moving through a membrane.',
    hint:'The two-lobed regulator is a protein tyrosine phosphatase in the RAS/MAPK pathway. Increased activity can alter signals that guide growth and development.'
  },
  RNU4ATAC:{
    biology:'An intron loop is removed and the flanking RNA segments join. A specialized splicing system performs this task for a less common class of introns.',
    hint:'Among the RNA genes, look for the one used by the minor spliceosome. Skeleton, antibody, and retinal findings help distinguish this clinical association.'
  },
  STING1:{
    biology:'Follow the route from the endoplasmic reticulum to the Golgi, then toward a nuclear response. The picture links membrane trafficking to immune signaling.',
    hint:'The relevant protein can activate without its usual trigger when a variant increases its activity. Persistent signaling connects inflammation in the skin and lungs.'
  },
  FGF14:{
    biology:'Compare the two fixed DNA tracks. Their flanks match, but one amber repeat is longer; the drawing compares sequences rather than showing a repeat growing.',
    hint:'The change is a GAA repeat expansion in intron 1 of a neuronal-signaling gene. Its location outside the coding sequence helps explain why standard exome sequencing can miss it.'
  }
};

// Completion-only text intentionally names the answer. Image solving and gene
// recognition share the same visible gene → function → clinical explanation.
export function geneClueConnection(round){return round.clinical?.completionConnection??round.clinical?.connection??round.geneBody;}
