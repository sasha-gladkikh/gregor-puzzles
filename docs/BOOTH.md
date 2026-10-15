# Conference booth guide

A checklist for running GREGoR Puzzles on a shared device at ASHG, and for testing it with first-time players.

## Before the meeting

1. **Scientific sign-off.** Record each reviewer decision in `game/signoff.mjs` (see [REVIEW.md](REVIEW.md)). To show only approved rounds, set `requireApproval` to `true`; the build stops if no round is approved.
2. **Real devices.** Test on a current iPhone (Safari), an older or smaller iPhone (SE or mini), and the actual booth hardware. Use the checklist below.
3. **Offline fallback.** Booth Wi-Fi is unreliable. On the booth laptop, run `npm start` once while online and confirm that `http://localhost:4173` plays every round with Wi-Fi turned off. Progress on localhost is separate from the hosted site.
4. **QR code.** [booth-qr.svg](booth-qr.svg) opens `https://sasha-gladkikh.github.io/gregor-puzzles/` and decodes correctly. Print it at least 3 cm wide. The same code appears in **How to play** on larger screens.

## On the booth device

- Start at round 01, the recommended first round. **Practice** is the default.
- Between visitors, open **All rounds → New player → Start fresh**. This clears every round's pieces, hints, and times in that browser and keeps editorial notes.
- On an iPad, use Guided Access (Settings → Accessibility) to keep the game in Safari.
- Quiet placement and completion sounds start on. Mute them with the header sound control if needed; the choice is saved across rounds and reloads. New player resets sound to on. There is no shared ranking. Timed results include reading time, and entering the gene ends the puzzle early, so times are not comparable between visitors.

## Testing with first-time players

Recruit 6–8 people who have not seen the game: clinicians, laboratory scientists, a genetic counselor, a trainee, and one or two non-specialists. Hand over the phone with the game open and say only "It's a genetics puzzle." Ask them to think aloud for two rounds.

Record:

- Time to the first correct placement.
- Scrolling up and down between the board and the pieces (should now be rare).
- Whether they notice a new clue or image note within about 5 seconds.
- Seconds spent on the completion card before **Continue**.
- Any question they ask without prompting.

Afterward, ask each person to explain the round's gene–mechanism–clinical connection in their own words. This is an observation for design, not evidence that the game improves learning.

Simulate the booth once: three people in a row on one device, standing, in a noisy room, with a two-minute limit, using **New player** between them.

## iPhone and Safari checklist

- Board, strip, and pieces fit on screen once the board is scrolled to the top.
- Taps on board positions do not zoom the page.
- Portrait and landscape; Safari text size at 125% and 150%.
- Private Browsing (progress clears when the tab closes).
- Reduce Motion on: pieces place without movement; walkthroughs use Previous/Next and do not auto-advance. Nothing essential is lost.
- Complete a round, open **See it work**, play/pause, step manually, and close it. Opening a dialog or leaving the tab pauses the sequence.
- Verify sound starts on, muting persists after reload, and New player restores sound to on. Verify no sound occurs on page load.
- Complete the collection and scroll to the completion banner: the logo assembles once, without moving the board.
- VoiceOver: complete one round; pieces announce their position.
- Airplane mode after loading: switch rounds and note what fails.
- Connect the phone to a Mac and use Safari Web Inspector for console errors.
