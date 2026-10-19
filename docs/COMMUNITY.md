# Leaderboard and puzzle suggestions

Playing and suggesting a puzzle require no sign-in. Puzzle suggestions use the website’s own form, backed by private Google Forms responses. Leaderboard submissions use this repository's public GitHub Issues and require a GitHub account. No account, access token, or secret is stored by the game.

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

The home page contains a branded HTML form. A gene or condition (or both) and clinical features are required; reference, name, and email are optional. Contact fields sit in an optional disclosure. Submission requires no Google or GitHub account. `game/suggestions.mjs` validates input, then sends a cross-origin JSON POST with `Content-Type: text/plain;charset=utf-8` to the deployed Google Apps Script endpoint. The receiver validates the request again and saves it as a private Google Form response. The clinical-features answer uses the existing `phenotypes` field and Google Form question.

Success appears only after an HTTP-success response containing `{ok: true, receipt: "…"}`. A blocked request, timeout, malformed response, or server rejection keeps the entered text and offers retry and the native Google Form as a fallback. Retrying an unchanged suggestion uses the same request ID. The receiver caches a payload hash and opaque receipt for up to six hours, providing best-effort duplicate protection; cache eviction or service failure can still permit a duplicate. Editing the suggestion creates a new request ID. Values and contact details stay in memory until submission or page close; they are not saved in browser storage, URL parameters, analytics, or GitHub issues. A confirmed success clears the form.

Client limits are 60 characters for gene, 160 for condition, 2,000 for phenotypes, 500 for reference, 100 for name, and 254 for email. Line breaks are allowed in phenotypes; other control characters are rejected. References must be complete HTTP or HTTPS URLs without embedded credentials. Optional email addresses are validated, and a hidden website field is used as a spam trap. The public endpoint URL is not a credential; owner access and response-writing logic remain server-side.

Responses are private to the form owner and explicitly authorized team collaborators. Optional contact details are for following up on a suggestion. Do not publish responses, contact details, or a response spreadsheet in this repository, the leaderboard snapshot, or the built site. Keep response summaries unavailable to respondents, automatic email collection off, and any organization-only or one-response sign-in restriction off.

Request published gene–condition information only, with no patient details, personal genetic results, or unpublished family data. A suggestion is a request for future educational content, not validation of the association. Before building a round, review its gene–condition evidence, mechanism, inheritance, phenotypic variability, and references through the existing scientific review process.

When changing the form or receiver, confirm the branded website form works in a signed-out browser, accepts a gene-only or condition-only suggestion without name or email, and shows confirmation only after the response is stored. Test retry, invalid input, an unavailable receiver, and a narrow phone screen. Validation must reveal any collapsed optional fields before focusing an invalid value. The native Google Form remains a no-script and error fallback. It retains its original required gene and condition questions; enter “Not specified” for the unknown field when using that fallback. Keep its responder URL current in the home page and `game/suggestions.mjs`; never publish an editor or response-sheet link.

### Maintain the receiver

The deployed Apps Script source is versioned in `server/google-forms/Code.gs`. It executes as the form owner with only the Google Forms OAuth scope and accepts anonymous requests. Its GET endpoint exposes protocol readiness only, never submitted responses. The exact six question titles, item types, and required flags are checked before any write. Gene and condition remain required in the native form, while the receiver requires at least one in the submitted payload and records a missing counterpart as “Not specified”. This compatibility mapping preserves the existing form schema. It occurs after validation and request hashing, so retries of the same normalized payload retain their receipt. Changing the form schema requires a coordinated receiver update.

After editing the receiver, update the existing web-app deployment to a new version so its URL stays stable. The client endpoint is `SUGGESTION_ENDPOINT` in `game/suggestions.mjs`. Keep it empty until deployment is authorized and tested; never publish a nonworking connection. Test a clearly labelled submission from the site and verify it in the owner's Google Forms Responses tab before release. The built site includes client files only, with no Google credentials or response exports.

## Module interface

`game/community.mjs` exports:

- `eligibleScore(round, rawSave)`: a canonical score or `null`. Pass the original persisted JSON, not a restored session with reconstructed timestamps.
- `scoreIssueURL(score)`: a draft URL; throws for invalid results.
- `parseIssueScore(issue)`: a structurally valid, labelled score plus issue-author metadata, or `null`. This alone does not establish current approval; `loadLeaderboard` verifies the event history before publication.
- `loadLeaderboard({fetchImpl, signal})`: scores whose approval is current, or a thrown refresh error. `fetchImpl` supports authenticated deployment requests and isolated tests.
- `rankScores(scores, roundNumber)`: the fastest score per account for the selected round, with ranks.
- `formatTime(seconds)`: a duration such as `0:45.1` or `1:00:01.2`.

The canonical schema has exactly `schema`, `roundId`, `roundNumber`, `seconds`, `hints`, `peeks`, and `geneHintsSeen`. `schema` is `gregor-score-v1`; `roundNumber` is a two-digit catalogue number. Parsed entries also include `login`, `issueNumber`, `url`, and `submittedAt`. Rendering code must insert all external strings as text, never as HTML.

See [GitHub's issues API](https://docs.github.com/en/rest/issues/issues#list-repository-issues) and [creating issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue).
