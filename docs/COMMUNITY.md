# Leaderboard and puzzle suggestions

The home page connects players through this repository's public GitHub Issues. No account, access token, or secret is stored by the game. Playing does not require GitHub sign-in. Submitting a score or suggestion does: the game opens a draft, and the player reviews and submits it on GitHub.

## Leaderboard

Scores are **self-reported puzzle times**, not verified competition results or measures of genetic knowledge. There is no server-side game clock or anti-cheat service. A browser save and an issue body can be edited. The checks reject malformed results; they do not prove that a person played fairly.

One ranking is shown per round. Each GitHub account has one entry, its fastest approved time. Equal times share a rank; the following rank skips the occupied places (1, 1, 3). Times are stored to milliseconds and displayed to tenths of a second. Two displayed times can therefore look equal while differing at the stored precision.

Eligible submissions require:

- All 12 distinct pieces placed in Timed mode, without successful gene autofill.
- A current saved session with a real start and finish. Old, reconstructed, or unavailable timing is excluded; a preserved `leaderboardIneligible` flag prevents normalized legacy saves from becoming eligible. Restarting creates a new session.
- A consistent positive clock result of 1 second through 7 days. This broad sanity bound is not an anti-cheat threshold.
- Declared hint, gene-hint, and image-reference counts. Assistance is permitted; there is no separate unassisted category.

The clock begins with the first correct placement and continues during time away. It does not measure time spent studying before that placement. Wrong gene attempts and gene hints do not disqualify an otherwise completed image puzzle.

### Approve a score

1. Open the submitted issue. Confirm that it concerns a timed image puzzle and contains one unchanged `gregor-score-v1` JSON block.
2. Review it for obvious abuse. Do not treat the issue's numbers as independently verified evidence.
3. Apply the `leaderboard` label. Only labelled, well-formed score issues are eligible for publication. Create the label once if it does not exist.
4. The deployment workflow refreshes the static leaderboard snapshot. The result appears after a successful deployment; it is not instant.

The username comes from the GitHub issue author, never from a name supplied in the result. Remove the label to remove a score from the next deployed snapshot. A score is published only when its issue has no recorded update later than the most recent `leaderboard` label event. This conservative rule can exclude a score after comments, closing, or other metadata changes, even when the result is unchanged: review the issue, remove the label, and apply it again after your final change. Open and closed issues are both supported when approval is current. Editing the body of an approved score automatically removes the `leaderboard` label and refreshes the snapshot in the same workflow. A maintainer must review the edited result and reapply the label before it can appear again. Title-only edits do not automatically remove the label, but any recorded later update still fails the snapshot's freshness check until the label is reapplied. The dedicated revocation job alone has `issues: write`; tests, builds, and snapshot generation retain read-only issue access. A failed revocation blocks the refresh instead of republishing an unreviewed edit. The parser rejects additional or unsupported schema fields, wrong round IDs, invalid values, duplicate result blocks, pull requests, bot authors, and URLs outside this repository.

The home page reads the same-origin `leaderboard.json` snapshot. It does not call the GitHub API from every player's browser. This avoids exhausting a shared conference network's unauthenticated quota. The refresh script calls `loadLeaderboard()` using a deployment-side GitHub credential where available; credentials must never be written into the snapshot or static game files. A failed refresh must be surfaced by the build rather than replacing real scores with a silently partial list.

The loader includes open and closed issues, paginates up to 1,000 issues, and checks each candidate's label history (up to 1,000 events per issue). It requires valid UTC timestamps and a most recent approval event at or after the issue's `updated_at`, with no subsequent unlabelling. This check runs independently of edit-triggered workflows, so a delayed moderation job cannot by itself allow a stale approval into a new snapshot. Only normalized score fields are published; event payloads remain server-side. A failed event request, malformed approval evidence, or additional required page fails the whole refresh. At that point, maintainers should introduce an archived season or raise the limit deliberately. No API error should be represented as “no scores yet.”

## Suggest a puzzle

The suggestion form opens an issue containing a gene, condition, optional phenotype or teaching points, and an optional public reference. Inputs are limited to 60, 160, 600, and 300 characters respectively. References must be complete HTTP or HTTPS URLs without embedded credentials. Unsupported control characters and unsafe URL schemes are rejected. The final encoded draft URL is also limited to 7,500 characters; unusually long multilingual drafts receive a readable request to shorten the text.

Submissions are public. Request published gene–condition information only, with no patient details, personal genetic results, contact information, or unpublished family data. A suggestion is a request for future educational content, not validation of the association. Before building a round, review its gene–condition evidence, mechanism, inheritance, phenotypic variability, and references through the existing scientific review process.

The game does not submit issues automatically. Prefilled issue URLs include only `title` and `body`, without a `labels` parameter that could prevent an ordinary visitor from opening the draft. Maintainers may organize suggestions with their own labels after submission.

## Module interface

`game/community.mjs` exports:

- `eligibleScore(round, rawSave)`: a canonical score or `null`. Pass the original persisted JSON, not a restored session with reconstructed timestamps.
- `scoreIssueURL(score)`: a draft URL; throws for invalid results.
- `suggestionIssueURL({gene, condition, phenotypes, reference})`: a draft URL; throws a readable validation error.
- `parseIssueScore(issue)`: a structurally valid, labelled score plus issue-author metadata, or `null`. This alone does not establish current approval; `loadLeaderboard` verifies the event history before publication.
- `loadLeaderboard({fetchImpl, signal})`: scores whose approval is current, or a thrown refresh error. `fetchImpl` supports authenticated deployment requests and isolated tests.
- `rankScores(scores, roundNumber)`: the fastest score per account for the selected round, with ranks.
- `formatTime(seconds)`: a duration such as `0:45.1` or `1:00:01.2`.

The canonical schema has exactly `schema`, `roundId`, `roundNumber`, `seconds`, `hints`, `peeks`, and `geneHintsSeen`. `schema` is `gregor-score-v1`; `roundNumber` is a two-digit catalogue number. Parsed entries also include `login`, `issueNumber`, `url`, and `submittedAt`. Rendering code must insert all external strings as text, never as HTML.

See [GitHub's issues API](https://docs.github.com/en/rest/issues/issues#list-repository-issues) and [creating issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue).
