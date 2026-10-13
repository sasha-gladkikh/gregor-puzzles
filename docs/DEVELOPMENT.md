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

- `src/`: game, scientific content, editorial review, and illustrations.
- `scripts/`: build and local server.
- `tests/`: game logic, build integrity, and server checks.
- `docs/`: scientific rationale, review instructions, and development notes.
- `.github/`: automated checks and feedback forms.

The ten-round catalog is in `src/rounds.mjs`; clinical profiles and vocabulary are in `src/clinical.mjs` and `src/hpo-terms.mjs`. Illustration metadata is in `src/artwork-data.mjs`. The original CLCN1 module remains for save compatibility. Earlier design experiments remain in Git history.

## Publishing

The GitHub repository stays private. Only the generated `dist/` files are published to the public game host. They contain no source workbook, family identifiers, individual variants, or development documents. Browser-delivered game code is necessarily accessible to players.

Netlify builds `main` automatically using `netlify.toml` and publishes only `dist/` to [gregor-puzzles.netlify.app](https://gregor-puzzles.netlify.app). Run tests before pushing. Use the existing Netlify project to preserve its URL and browser progress. Do not publish the repository root.

## Validation and limits

GitHub Actions runs tests and a build for pushes and pull requests. Checks cover placement, reveals, reasoning questions, timing, save migration, all ten rounds, published file references, and the local server.

Browser checks cover completion, review navigation, reload restoration, and phone-width layouts. These do not replace physical iPhone/Safari or full accessibility testing. Scientific review remains pending.

Progress and editorial notes stay in browser storage and do not sync between devices. Moving from a local preview to the hosted URL starts separate progress. Clearing browser data removes it. Timing is local; there is no account system, analytics, or shared leaderboard.
