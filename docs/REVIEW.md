# Scientific review

Open **Science** for the full scientific profile, then **Editorial review** for player-facing wording and personal notes. Both pages support searches by gene, condition, clinical term, or HPO identifier; puzzle completion is not required.

For each round, assess:

- **Association:** condition identifier, inheritance, and variant mechanism.
- **Mechanism:** illustration, causal explanation, and stated exceptions. **Explore the illustration** on the completion screen and editorial page sequences the three cited image notes with an attention spotlight. This is not a simulation of molecular movement. On Science, selecting a structure connects it to its explanation and reference. Check both presentations, including on a phone. Rounds 05, 07, and 09 also have a before/after mechanism figure; rounds 05 and 08 share a major/minor spliceosome comparison.
- **Phenotype:** clinical pattern, age and course, variability, and HPO mappings.
- **Teaching:** progressive clues, image notes (each appears when the piece containing it is placed, in anonymous wording until the round is complete; review both versions), and the completion card shown to players: the connection sentence, clinical pattern, and one caveat.
- **Evidence:** whether each source supports the associated claim.
- **Cross-round teaching:** related-round links, the process map, and the printable field guide. The map groups illustrated processes rather than asserting exclusive localization or direct interaction. The field guide reproduces completed rounds' mechanisms, clinical patterns, interpretation notes, and selected references; it is not independently approved content.

## Recording sign-off

The team's sign-off checklist lives in [`game/signoff.mjs`](../game/signoff.mjs). For an approved round, set `status: 'approved'`, the reviewer's name, the date (YYYY-MM-DD), and each of the four checks to `true`. A round counts as approved only when all four checks, the reviewer, and the date are present. The public interface does not display this checklist or approval labels.

Set `requireApproval` to `true` to make only approved rounds playable. Editorial review still lists every round. The build fails if no round is approved.

[Report a scientific correction](https://github.com/sasha-gladkikh/gregor-puzzles/issues/new?template=scientific-feedback.yml). Include the round, exact statement, proposed correction, and supporting source. Do not include patient information.

Editorial notes save in your browser only. **Copy review notes** collects all nonempty notes, including notes hidden by a search, for you to paste into a message or document. If automatic copying is unavailable, a selected text field provides a manual-copy fallback. Nothing is submitted to the team, and notes do not constitute approval. Printing the editorial page expands its content sections and excludes personal notes.

For a learner-facing handout, open **Collection → Field guide**. It includes only rounds completed in the same browser. Use its print control to print or save a PDF.

**All ten rounds remain pending scientific review, including the illustration walkthroughs.**

Physical iPhone/Safari, VoiceOver, and booth-hardware testing also remain pending; see [BOOTH.md](BOOTH.md).
