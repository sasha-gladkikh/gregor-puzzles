# Development

Requires Node.js 22 or later; Node.js 24 LTS is recommended. No external runtime packages or install step are needed.

```sh
npm start          # Build and serve the game at http://localhost:4173
npm test           # Game logic and preview-server checks
npm run build      # Generate static files in dist/
```

If port 4173 is occupied, run `npm start -- --port=4174`. Stop the server with **Ctrl+C**. Restart after source changes. The preview server listens on `127.0.0.1` and serves only `dist/`.

## GitHub Codespaces

[Create a codespace](https://codespaces.new/sasha-gladkikh/gregor-puzzles) with repository access. The container runs tests on creation and starts the game when it opens. In the **Ports** panel, open port **4173** in a browser if it does not open automatically.

Keep the forwarded port **Private**, GitHub's default. Sign in with the same GitHub account to open that forwarded URL on a phone. A local `localhost` URL only works on the computer running the server. Codespaces availability, allowances, and charges depend on the account. This configuration does not publish a public website.

If the preview does not start, run `npm start` in the terminal. Startup output is in `/tmp/gregor-puzzles.log`. See [GitHub's port-forwarding documentation](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace).

## Source map

- `index.html`, `app.mjs`, `style.css`: game, library, and completion flow.
- `engine.mjs`, `session.mjs`, `collection.mjs`: geometry, placement, learning gates, timing, and saved progress.
- `rounds.mjs`, `clinical.mjs`, `hpo-terms.mjs`: catalog, scientific content, and terminology. `round.mjs` retains the original round for compatibility.
- `artwork/01.webp`–`10.webp`: active illustrations. `artwork-data.mjs` supplies descriptions and landmarks; `artwork-ui.mjs` renders the guides.
- `review.html`, `review.mjs`, `review.css`: complete scientific content and local editorial notes.
- `build.mjs`: static build with content-based asset revisions.
- `scripts/start.mjs`, `scripts/server.mjs`: local preview.
- `test.mjs`, `tests/`: automated checks.
- `docs/archive/`: earlier artwork, branding, and selection rationale.

`artwork-study.html` retains the earlier illustration comparison. Preview saves are separate from the main collection.

## Validation

GitHub Actions runs tests and a production build for pushes and pull requests. Tests cover geometry, incorrect placement, reveals, recognition, learning gates, timing, save migration, all ten rounds, artwork metadata, and preview-server behavior.

Previous browser checks covered full completion, review navigation, reload restoration, all ten images, and layouts at 320–390 CSS pixels. Viewport checks are not physical iPhone/Safari or complete accessibility tests. The Codespaces configuration requires a first cloud trial with an authorized account.

## Runtime limits

The game is static. It has no account system, analytics, or shared leaderboard. Progress and review notes remain in browser storage and do not sync between devices. Clearing browser data removes them. Answers are present in client source; timing is local and not tamper-resistant.

Only files in `dist/` are needed for a static deployment. The repository must remain private unless its owner explicitly authorizes a different destination. Scientific review and final branding remain pending.
