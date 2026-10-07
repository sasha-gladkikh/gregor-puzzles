# GREGoR Puzzles

A modern academic genetics puzzle with a scientific schematic and progressively revealed clues. The first round explores **CLCN1 and recessive myotonia congenita (OMIM 255700)**, the first gene–condition pair in the supplied selection.

## Play locally

Run `python3 -m http.server 4173` in this directory, then open http://localhost:4173. No dependency installation is needed. Serve over HTTP; JavaScript modules do not reliably run from a file URL.

- Assemble 12 interlocking pieces by dragging, or select a piece and select its board position.
- Biology clues appear at 2, 4, 6, and 8 pieces. The gene appears at 11; the condition at 12.
- A correct gene symbol completes the puzzle. This route is recorded separately from assembly.
- Optional timer, image reference, hints, keyboard controls, reduced-motion support, and device-local progress.
- A short learning check and condition/community links appear after completion.

`npm test` runs the state/geometry tests. `npm run build` creates a static `dist/` copy. Any static host can serve that directory. Runtime code is plain HTML, CSS, JavaScript, and original SVG; no application framework or backend is required. The interface uses system sans-serif fonts and makes no font-service requests.

## Content and sources

The supplied workbook is a slim six-column gene/condition export, not the wider table described in the meeting. Its classifications are pathogenic or likely pathogenic; it does not have a site column, so Stanford membership could not be independently filtered. Known gene–disease association was verified using public references. No workbook is included here. No family identifiers, patient phenotypes, variants, row-level classifications, or sequencing metadata are stored or displayed.

- [OMIM, autosomal recessive myotonia congenita, 255700](https://omim.org/entry/255700): condition reference. The matching link is independently supplied by MedlinePlus. Direct automated retrieval of the OMIM entry was unavailable; the prototype does **not** claim its phenotype prose was extracted from OMIM.
- [MedlinePlus Genetics, myotonia congenita](https://medlineplus.gov/genetics/condition/myotonia-congenita/): accessible source for the paraphrased channel, inheritance, and phenotype content.
- [GeneReviews, Myotonia Congenita](https://www.ncbi.nlm.nih.gov/books/NBK1355/): further clinical reading.
- [Muscular Dystrophy Association](https://www.mda.org/disease/myotonia-congenita): relevant community resource, not a disease-specific foundation or a donation request.

Sources checked 7 October 2026. Content is an educational prototype pending scientific and community review before conference use. Symptoms differ among people. CLCN1 also has a dominant association: this round concerns the recessive condition only. The original illustration is conceptual and is not an atomic structure, experimentally determined topology, patient image, or model of a specific variant. No binding partners or unverified protein interactions are invented.

## Add the next round

`round.mjs` contains the content; `engine.mjs` contains puzzle geometry and state; `app.mjs` renders and handles input. Curate one verified gene–condition pair at a time in original table order, deduplicating repeated pairs. Keep any extraction outside the repository and never commit the workbook. This release has **one playable round**. A round selector, additional content, and shared leaderboard are deliberately future features. Client-side answers are inspectable; this prototype is not a secure competition system. The timer measures active visible play after the first interaction, pauses while instructions are open, and is not a clinical or educational score.

Progress is stored only in the browser's local storage. There is no analytics, account system, or external submission of guesses. Restart clears the saved round. Scientific references and community pages open only when selected. Branding is provisional and does not imply official Stanford endorsement.

## Visual design

Cardinal accents, white panels, neutral grays, system sans-serif typography, and a compact learning workspace take inspiration from [Stanford’s primary color palette](https://identity.stanford.edu/design-elements/color/primary-colors/). The interface retains its own GREGoR Puzzles wordmark and does not display the Stanford seal or university wordmark. The membrane drawing is an original schematic with flat scientific labels, not a protein structure model.
