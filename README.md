# GREGoR Puzzles · GSS collection

Ten playable image-jigsaw rounds about rare disease gene–condition relationships. A professional GSS blue interface pairs original biological schematics with progressively revealed scientific clues. No patient records are included.

## Game guide and branding

[Read the game explanation and selection rationale](docs/Game-design-and-selection.pdf) for all ten conditions, their educational purpose, and the review questions for Matt. [Compare three logo and name directions](branding/GSS-game-branding-concepts.png); editable SVG logos are in `branding/`. These concepts do not replace the current game branding.

## Play or review

```sh
npm test
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173. No dependency installation is needed. `review.html` presents all content, illustrations, answer explanations, and references without requiring puzzle completion. Serve over HTTP; ES modules do not reliably run from a file URL. Any static host can serve `dist/`.

- Choose any of 10 rounds from the library. Each round has 12 interlocking image pieces and two learning questions.
- On iPhone, tap a piece and then its board position. With a mouse, drag or click to place. Keyboard users can Tab and Enter; Escape clears a selection.
- Clues unlock at 2, 4, 6, and 8 pieces. The gene unlocks at 11, the condition at 12. Unfinished rounds in the library do not show gene names.
- A correct gene symbol completes the picture. Both questions still need to be completed, and this recognition route is recorded separately.
- Practice is untimed. Optional timed mode includes time spent in other rounds, background tabs, reloads, and instructions. The clock stops once the picture and both questions are finished. Restart the current round to change modes.
- Progress is stored separately for each round in this browser. Restart affects only the current round. Existing CLCN1 saves retain their original storage key.
- Piece silhouettes use dark non-scaling outlines, contrasting tray cards, subtle shadows, and letter labels. The phone layout uses three larger pieces per row, keeps page scrolling available, and brings the board into view after selection. Hints, reference images, reduced-motion support, descriptive piece labels, and full diagram descriptions are available. A storage warning appears if local saving is blocked.
- Completion includes a next-round action, a biology summary, phenotype descriptions, inheritance, general variant classes, OMIM and supporting references, and a community resource.

## The ten rounds

The selection samples different biological processes from the supplied GFT pairs, retaining their relative order. It is an educational selection, not a clinical priority ranking; Matt's team can replace any selection during review.

1. **CLCN1 / recessive myotonia congenita / OMIM 255700:** skeletal muscle chloride conductance.
2. **GJB2 / recessive nonsyndromic hearing loss 1A / OMIM 220290:** gap-junction communication.
3. **SLC29A3 / histiocytosis-lymphadenopathy plus syndrome / OMIM 602782:** intracellular nucleoside transport.
4. **SBDS / Shwachman-Diamond syndrome 1 / OMIM 260400:** ribosome maturation.
5. **RNU4-2 / ReNU syndrome / OMIM 620851:** a functional RNA in the major spliceosome.
6. **CACNA1A / developmental and epileptic encephalopathy 42 / OMIM 617106:** calcium channels and synaptic release.
7. **PTPN11 / Noonan syndrome 1 / OMIM 163950:** SHP2 and RAS/MAPK regulation.
8. **RNU4ATAC / Roifman syndrome / OMIM 616651:** the minor spliceosome.
9. **STING1 / STING-associated vasculopathy with onset in infancy / OMIM 615934:** excess interferon signaling.
10. **FGF14 / spinocerebellar ataxia 27B / OMIM 620174:** an intronic GAA repeat expansion.

FAM177A1 was discussed in earlier notes but was not among the supplied GFT pairs used for this collection. Repeat rows with different variant classifications are not separate levels.

## Scientific review and provenance

**All ten rounds are pending scientific review.** Sources checked 10 October 2026. The review page makes the full content available for Matt's team to vet before conference use. Review gene–condition mapping, mechanism, illustration, phenotype wording, inheritance, variant descriptions, and question explanations. Language aims to respect varied experiences and identities. There is no patient image, diagnostic task, treatment advice, donation solicitation, or implication that solving a puzzle repairs a person.

The input is the slim gene/condition selection supplied in the conversation. It contains pathogenic or likely pathogenic classifications but no site column, so site membership cannot be independently filtered from it. Only gene–condition relationships are included; no family identifiers, individual variants, patient phenotypes, row-level classifications, sequencing metadata, or workbook files are shipped. The variant descriptions are general published classes, not findings from individual families.

Every round links to the supplied matching OMIM condition identifier. Direct automated retrieval of OMIM text was unavailable. Phenotypes and biology are original paraphrases supported by MedlinePlus Genetics, GeneReviews, and primary research; they are **not represented as an extraction from OMIM**. References are stored with each round in `rounds.mjs` and shown in the game and review page. Community links were checked against the relevant organization's site. NORD is used where a specific foundation was not verified. Links do not solicit donations.

Scientific distinctions preserved include dominant versus recessive associations of the same gene, functional RNAs rather than invented proteins for RNU4-2/RNU4ATAC, condition-specific CACNA1A mechanisms, and FGF14's noncoding repeat expansion. The conceptual diagrams are not atomic structures, measured traces, complete pathways, or diagnostic repeat thresholds. Knowledge gaps and variable phenotypes are stated in the content.

## Design and branding

Colors are drawn from the [public GSS logo](https://gregorconsortium.org/sites/default/files/2022-08/GSS_Logo_Primary.png): royal blue `#0043fd`, navy `#0c063f`, and cyan `#00a9f2`. [GREGoR Stanford Site](https://gregor.stanford.edu/) provides the institutional context. The temporary GSS text badge and GREGoR Puzzles wordmark await Jimmy's branding input. No Stanford seal or university wordmark is recreated. Typography uses system fonts; assets are local SVGs.

## Project structure

- `rounds.mjs`: ten-round catalog, sources, questions, and review status. `round.mjs` retains the original CLCN1 content for compatibility.
- `engine.mjs`: curved jigsaw geometry and placement state.
- `session.mjs`: learning gates, save restoration, and wall-clock timing.
- `collection.mjs`: progress across independently saved rounds and anonymous numbered URLs.
- `app.mjs`, `index.html`, `style.css`: game, library, and completion flow.
- `artwork/01.svg` through `10.svg`: original conceptual illustrations.
- `scripts/generate-artwork.py`: regenerates SVGs using Python's standard library; `artwork.svg` is the original source for the first illustration.
- `review.html`, `review.mjs`, `review.css`: reviewer view with all answers.
- `test.mjs`: geometry, learning, timing, migration, catalog, and collection regression tests.

## Validation and limitations

18 automated checks cover shared piece geometry, placement errors, final reveals, recognition, save validation, hint selection, timing, legacy saves, learning gates, every round through both completion routes, distinct GFT mappings, per-round save isolation, round reset, and corrupt/blocked storage. Browser testing covers real interactions, full collection completion, navigation, reload restoration, and responsive layout. The responsive layout was checked at 320 and 375 CSS pixels, including piece selection, placement, the library, and save restoration. A physical iPhone/Safari test is still recommended; browser viewport checks do not emulate the iOS engine. This is not a complete screen-reader or real-device accessibility audit.

This is a static game with no account system, analytics, data collection, external guess submission, or shared leaderboard. Answers are inspectable in client source. Timing is local, not tamper-resistant, and is not a clinical or educational score. Clearing browser data removes progress; progress does not sync between devices. Timed rounds continue while another round is open. Scientific review and final branding remain human review tasks, not completed approvals.
