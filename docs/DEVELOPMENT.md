# Development

Requires Node.js 22 or later. Node.js 24 LTS is recommended. No package installation is needed.

```sh
git clone https://github.com/sasha-gladkikh/gregor-puzzles.git
cd gregor-puzzles

npm start          # Build and serve at http://localhost:4173
npm test           # Game, build, and server checks
npm run build      # Generate dist/ for hosting
```

Use `npm start -- --port=4174` if the default port is occupied. Stop with **Ctrl+C**; restart after edits. The local server serves only `dist/` and listens on `127.0.0.1`.

## Structure

- `game/`: game, collection, field guide, scientific profiles, editorial review, and illustrations.
- `scripts/`: build and local server.
- `tests/`: game logic, build integrity, and server checks.
- `docs/`: scientific rationale, review instructions, and development notes.
- `.github/`: automated checks and feedback forms.

The ten-round catalog is in `game/rounds.mjs`; clinical profiles, completion-card text, and vocabulary are in `game/clinical.mjs` and `game/hpo-terms.mjs`. Illustration metadata and image-note positions are in `game/artwork-data.mjs`; each note appears when the piece containing its point is placed. Mechanism figures and the spliceosome comparison are in `game/mechanism.mjs`. Scientific sign-off and the `requireApproval` switch are in `game/signoff.mjs`. Saved progress uses stable round IDs, so earlier saves still load. Earlier design experiments remain in Git history.

Keep repeated content to a minimum: one completed gene–condition summary, one illustration guide, and one external link per reference within each round. Group related findings under shared headings and citations. Repeat navigation only where it helps people move through the site.

The shared shell is in `game/site.mjs` and `game/site.css`: linked Stanford affiliation, Play / Collection / Science navigation, and the project footer. `game/about.html` describes the project. The original logo remains in `game/icons/`; its display frame crops transparent vertical padding without stretching the artwork. Source Sans 3 is self-hosted in `game/fonts/`, with Adobe source details and the SIL Open Font License.

`game/play.css` controls the responsive board, adjacent desktop tray, phone layout, completion card, and Focus view. `game/experience.mjs` contains synthesized audio with a saved mute preference, cancellable illustration walkthroughs, image highlights, and the collection logo animation. Walkthroughs reuse the three cited image notes. `game/discovery-motion.mjs` keeps new clues beside the action until the player saves them to the sticky learning panel; on phones the destination is the Clues control. `game/gene-bank.mjs` offers the catalogue’s gene symbols through the existing recognition flow, with an explicit check before completing the image. Gene hints are available from the start: first a biological clue, then an optional symbol clue. Each stage counts once and persists across reloads. There are no piece-placement hints.

`game/artwork-motion.mjs` animates the completed illustration inside the puzzle board. The ten scenes in `game/artwork-motion-data.mjs` use cutouts from the original artwork over localized clean background patches in `game/artwork/motion/`. Original images remain unchanged. New completions animate when visible, with pause/resume controls beneath the image; returning to a completed round does not autoplay. Independent repeating float and transport paths keep the 48 original-pixel cutouts moving at different rates. Subtle pointer parallax affects floating objects only. Restrained highlights follow existing signaling arrows and the neuron axon. The current round’s assets preload after the first interaction. Hidden tabs, dialogs and offscreen playback pause motion. Image-note walkthroughs restore the still image. Reduced-motion preferences keep the original still image. Asset failures also preserve the still image. Sequences are illustrative, not molecular simulations: fixed DNA-repeat diagrams never grow, and released RNA products remain distinct from active spliceosome structures. The background patches were generated from the source images; moving structures use the original pixels. Generation prompts and visual QA are recorded in `docs/artwork-motion.json`.

`game/science.mjs` and `game/science-ui.mjs` provide searchable gene profiles, interactive figures, and deduplicated references. Shared citation helpers in `game/clinical-ui.mjs` assign stable reference numbers; each external paper appears once per round, with compact links from the relevant content. Symptoms share a citation at the system heading when their sources match; different evidence stays attached to the corresponding finding. `game/review.mjs` presents player-facing wording for editorial review. Both pages expose full scientific content independently of game progress. The sign-off checklist remains in `game/signoff.mjs`; the public interface displays no approval labels.

`game/collection-page.mjs` renders the collection and process map. `game/collection-data.mjs` defines related rounds and shared guide helpers. `game/field-guide.mjs` renders printable pages for completed rounds only, using the existing `collectionProgress` reader. The process map organizes illustrated processes; it does not assert exclusive localization or direct interaction. Existing round IDs, storage keys, and save migration remain unchanged.

The QR code in `game/icons/` was generated with macOS Core Image and verified by decoding; regenerate it if the hosted address changes. See [BOOTH.md](BOOTH.md) for conference setup and device testing.

## Publishing

The GitHub repository is public. GitHub Pages publishes only the generated `dist/` files. No source workbook, family identifiers, individual variants, or development documents are included in the game build.

All HTML pages include a `noindex` robots meta tag. This asks supporting search engines not to list the game; it does not restrict access or prevent link forwarding. The public GitHub repository can still be found in search. Do not block crawling in `robots.txt`, because crawlers must read the noindex directive.

The **Check and publish** workflow tests and builds every push to `main`, then deploys the game to [GitHub Pages](https://sasha-gladkikh.github.io/gregor-puzzles/). Pull requests run checks without deploying. The repository's Pages source must be **GitHub Actions**. No separate hosting account is needed.

## Validation and limits

GitHub Actions runs tests and a build for pushes and pull requests. Checks cover placement, reveals, image-note placement, gene entry and previous symbols, new-player reset, sign-off gating, source traceability for completion cards and figures, picture completion, timing, save migration, all ten rounds, published file references, and the local server.

Browser checks cover completion, review navigation, reload restoration, and phone-width layouts. Sequence tests cover idle startup, manual navigation, pause/cancellation, finite walkthroughs, continuous artwork loops, bounded parallax, asset-cache retry, and duplicate play requests. Sound is on by default and plays only after a user gesture; a saved mute preference is respected. No audio files or external services are used. These do not replace physical iPhone/Safari or full accessibility testing. Scientific review remains pending.

Progress stays in browser storage and does not sync between devices. Moving from a local preview to the hosted URL starts separate progress. Clearing browser data removes it. Collection and field-guide pages read those same saved rounds; they do not create a separate progress format. Timing is local; there is no account system, analytics, or shared leaderboard.
