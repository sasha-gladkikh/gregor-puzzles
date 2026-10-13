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

- `game/`: game, scientific content, editorial review, and illustrations.
- `scripts/`: build and local server.
- `tests/`: game logic, build integrity, and server checks.
- `docs/`: scientific rationale, review instructions, and development notes.
- `.github/`: automated checks and feedback forms.

The ten-round catalog is in `game/rounds.mjs`; clinical profiles and vocabulary are in `game/clinical.mjs` and `game/hpo-terms.mjs`. Illustration metadata is in `game/artwork-data.mjs`. The original CLCN1 module remains for save compatibility. Earlier design experiments remain in Git history.

## Publishing

The GitHub repository is public. GitHub Pages publishes only the generated `dist/` files. No source workbook, family identifiers, individual variants, or development documents are included in the game build.

Both HTML pages include a `noindex` robots meta tag. This asks supporting search engines not to list the game; it does not restrict access or prevent link forwarding. The public GitHub repository can still be found in search. Do not block crawling in `robots.txt`, because crawlers must read the noindex directive.

The **Check and publish** workflow tests and builds every push to `main`, then deploys the game to [GitHub Pages](https://sasha-gladkikh.github.io/gregor-puzzles/). Pull requests run checks without deploying. The repository's Pages source must be **GitHub Actions**. No separate hosting account is needed.

## Validation and limits

GitHub Actions runs tests and a build for pushes and pull requests. Checks cover placement, reveals, picture completion, timing, save migration, all ten rounds, published file references, and the local server.

Browser checks cover completion, review navigation, reload restoration, and phone-width layouts. These do not replace physical iPhone/Safari or full accessibility testing. Scientific review remains pending.

Progress and editorial notes stay in browser storage and do not sync between devices. Moving from a local preview to the hosted URL starts separate progress. Clearing browser data removes it. Timing is local; there is no account system, analytics, or shared leaderboard.
