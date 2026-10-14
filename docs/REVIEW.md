# Scientific review

Open the game and select **Editorial review**. Search by gene, condition, clinical term, or HPO identifier. All content and answers are available without completing a puzzle.

For each round, assess:

- **Association:** condition identifier, inheritance, and variant mechanism.
- **Mechanism:** illustration, causal explanation, and stated exceptions. Every round now offers **See it work** on the completion screen and editorial page. It sequences the same three cited image notes with a moving attention spotlight, not a simulation of molecular movement. Check the note order and highlighted structure, including on a phone. Rounds 05, 07, and 09 also have a before/after mechanism figure; rounds 05 and 08 share a major/minor spliceosome comparison.
- **Phenotype:** clinical pattern, age and course, variability, and HPO mappings.
- **Teaching:** progressive clues, image notes (each appears when the piece containing it is placed, in anonymous wording until the round is complete; review both versions), and the completion card shown to players: the connection sentence, clinical pattern, and one caveat.
- **Evidence:** whether each source supports the associated claim.

## Recording sign-off

Sign-off lives in [`game/signoff.mjs`](../game/signoff.mjs). For an approved round, set `status: 'approved'`, the reviewer's name, the date (YYYY-MM-DD), and each of the four checks to `true`. Editorial review shows the checks for every round. A round counts as approved only when all four checks, the reviewer, and the date are present.

Set `requireApproval` to `true` to make only approved rounds playable. Editorial review still lists every round, marked by status. The build fails if no round is approved.

[Report a scientific correction](https://github.com/sasha-gladkikh/gregor-puzzles/issues/new?template=scientific-feedback.yml). Include the round, exact statement, proposed correction, and supporting source. Do not include patient information.

Editorial notes save in your browser only. They are not submitted to the team and do not constitute approval. Printing expands the educational sections and excludes personal notes.

**All ten rounds remain pending scientific review, including the illustration walkthroughs.**
