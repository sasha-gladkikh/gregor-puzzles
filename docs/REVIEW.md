# Scientific review

Open **Science** for the full scientific profile, then **Editorial review** for player-facing wording. Both pages support searches by gene, protein name, former symbol, condition, clinical term, or HPO identifier; puzzle completion is not required.

For each round, assess:

- **Association:** condition identifier, inheritance, and variant mechanism.
- **Mechanism:** illustration, causal explanation, and stated exceptions. **Explore the illustration** on the completion screen and editorial page sequences the three cited image notes with an attention spotlight. This is not a simulation of molecular movement. On Science, selecting a structure connects it to its explanation and reference. Check both presentations, including on a phone. Rounds 05, 07, and 09 also have a before/after mechanism figure; rounds 05 and 08 share a major/minor spliceosome comparison.
- **Phenotype:** clinical pattern, age and course, variability, and HPO mappings.
- **Teaching:** progressive clues, image notes (each appears when the piece containing it is placed, in anonymous wording until the round is complete; review both versions), and the completion card shown to players: mechanism, clinical pattern, onset and course, clinical significance, and family implications.
- **Counseling and interpretation:** conditional recurrence, penetrance and expression, family variability, phase, uncertain variants, and testing limitations.
- **Evidence:** whether each source supports the associated claim. Review the disease-mechanism clue at 5 pieces and variant-type clue at 10, including their compact phone previews. Check that variant class is not treated as proof of pathogenicity or functional effect, that frequency language is supported, and that association-specific uncertainties are retained.
- **Cross-round teaching:** related-round links, the process map, and the printable field guide. The map groups illustrated processes rather than asserting exclusive localization or direct interaction. The field guide reproduces completed rounds' mechanisms, clinical patterns, onset and course, clinical significance, family implications, variant context, illustration qualifications, and selected references; it is not independently approved content.

## Recording sign-off

The team's sign-off checklist lives in [`game/signoff.mjs`](../game/signoff.mjs). For an approved round, set `status: 'approved'`, the reviewer's name, the date (YYYY-MM-DD), and each of the four checks to `true`. A round counts as approved only when all four checks, the reviewer, and the date are present. The public interface does not display this checklist or approval labels.

Set `requireApproval` to `true` to make only approved rounds playable. Editorial review still lists every round. The build fails if no round is approved.

[Report a scientific correction](https://github.com/sasha-gladkikh/gregor-puzzles/issues/new?template=scientific-feedback.yml). Include the round, exact statement, proposed correction, and supporting source. Do not include patient information.

Printing the editorial page expands its content sections.

For a learner-facing handout, open **Collection → Field guide**. It includes only rounds completed in the same browser. Use its print control to print or save a PDF.

**All ten rounds remain pending scientific review, including the illustration walkthroughs.**

Physical iPhone/Safari, VoiceOver, and booth-hardware testing also remain pending; see [BOOTH.md](BOOTH.md).
