// Intermediate hints explain how to connect the image to a gene family or
// process. They reuse the location/function teaching content and references
// already attached to each round; the final explanation is shown after naming.
// The SLC expansion was verified against the round's NLM gene reference:
// https://medlineplus.gov/genetics/gene/slc29a3/
export const geneHintConnections={
  CLCN1:{
    hint:'Match the cargo to the tissue: chloride ions moving through skeletal-muscle membranes. Look for a chloride-channel gene.',
    connection:'CLCN1 encodes ClC-1. The skeletal-muscle location and chloride-channel function point to the same protein.'
  },
  GJB2:{
    hint:'This channel links two neighboring cells. Look for a gap-junction gene whose protein supports communication in the cochlea.',
    connection:'GJB2 encodes connexin 26. Its gap-junction channels connect neighboring cochlear cells, linking the location and communication clues.'
  },
  SLC29A3:{
    hint:'SLC stands for solute carrier. This carrier moves nucleosides across lysosomal membranes, linking cellular recycling to membrane transport.',
    connection:'SLC29A3 encodes ENT3, a nucleoside transporter found in lysosomal membranes. SLC means solute carrier: the location and transported material explain the clues.'
  },
  SBDS:{
    hint:'The key step is removing a blocking factor from the large ribosomal subunit. Look for a maturation factor that helps the two subunits join.',
    connection:'SBDS helps release eIF6 from the large ribosomal subunit. That connects the maturation clue to the two subunits joining in the image.'
  },
  'RNU4-2':{
    hint:'The gene product is RNA itself. Look for a small nuclear RNA that participates in the major spliceosome.',
    connection:'RNU4-2 encodes a U4 small nuclear RNA. Its role in the major spliceosome explains both the nuclear location and functional-RNA clues.'
  },
  CACNA1A:{
    hint:'Follow the signal from calcium entering a nerve ending to transmitter release. Look for a calcium-channel gene involved in synaptic communication.',
    connection:'CACNA1A encodes the pore-forming subunit of CaV2.1. Calcium entry through this channel helps trigger neurotransmitter release.'
  },
  PTPN11:{
    hint:'This regulator acts in the RAS / MAPK pathway. Look for a protein tyrosine phosphatase that helps relay growth signals.',
    connection:'PTPN11 encodes SHP-2, a protein tyrosine phosphatase. Its regulation of RAS / MAPK connects the intracellular signaling and growth clues.'
  },
  RNU4ATAC:{
    hint:'The gene product is a functional RNA in the specialized minor spliceosome. Look for the RNA gene involved in processing minor introns.',
    connection:'RNU4ATAC encodes U4atac RNA. Its place in the minor spliceosome explains the specialized RNA-processing clues.'
  },
  STING1:{
    hint:'Focus on an intracellular immune-signaling protein that promotes an interferon response. In this round, gain-of-function variants leave signaling overactive.',
    connection:'STING1 encodes STING. Its interferon-signaling role connects the intracellular membranes to the immune-response clue.'
  },
  FGF14:{
    hint:'This round follows an expansion inside an intron. Look for a neuronal-signaling gene associated with an intronic repeat expansion.',
    connection:'FGF14 encodes an intracellular neuronal protein. This round links its signaling role to a GAA repeat expansion in intron 1.'
  }
};

// Completion-only text: these explanations intentionally name the answer.
export function geneClueConnection(round){return geneHintConnections[round.gene]?.connection??round.geneBody;}
