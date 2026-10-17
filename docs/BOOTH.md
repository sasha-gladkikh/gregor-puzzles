# Conference booth guide

A checklist for running GREGoR Puzzles on a shared device at ASHG, and for testing it with first-time players.

## Before the meeting

1. **Scientific sign-off.** Record each reviewer decision in `game/signoff.mjs` (see [REVIEW.md](REVIEW.md)). To show only approved rounds, set `requireApproval` to `true`; the build stops if no round is approved.
2. **Real devices.** Test on a current iPhone (Safari), an older or smaller iPhone (SE or mini), and the actual booth hardware. Use the checklist below.
3. **Offline fallback.** Booth Wi-Fi is unreliable. On the booth laptop, run `npm start` once while online and confirm that `http://localhost:4173` plays every round with Wi-Fi turned off. Progress on localhost is separate from the hosted site.
4. **QR code.** [booth-qr.svg](booth-qr.svg) opens `https://sasha-gladkikh.github.io/gregor-puzzles/` and decodes correctly. Print it at least 3 cm wide. The same code appears in **How to play** on larger screens.

## On the booth device

- Start at round 01, the recommended first round. **Practice** is the default.
- Gene recognition is optional. **Gene hint** offers location/function, a biological connection, then a symbol hint. **Gene bank** explains that a correct choice completes the round.
- Between visitors, open **Browse rounds → New player → Start fresh**. This clears every round's pieces, hints, and times in that browser.
- **Collection** shows saved progress and a teaching map of the illustrated processes. Its field guide contains only completed rounds and can be printed or saved as a PDF through the browser's print dialog.
- **Science** opens full gene profiles without requiring puzzle completion. Its **Editorial review** link opens the reviewer workspace.
- On an iPad, use Guided Access (Settings → Accessibility) to keep the game in Safari.
- Quiet placement and completion sounds start on. Mute them with the header sound control if needed; the choice is saved across rounds and reloads. New player resets sound to on. **Timed** begins at the first correct placement or accepted gene answer; mode choice remains available until then. There is no shared ranking. Times include subsequent reading and can end with early gene recognition, so they are not comparable between visitors.

## Testing with first-time players

Recruit 6–8 people who have not seen the game: clinicians, laboratory scientists, a genetic counselor, a trainee, and one or two non-specialists. Hand over the phone with the game open and say only "It's a genetics puzzle." Ask them to think aloud for two rounds.

Record:

- Time to the first correct placement.
- Scrolling up and down between the board and the pieces (should now be rare).
- Whether they notice a new clue or image note within about 5 seconds.
- Whether the persistent clue beneath the phone's board is readable and helps explain the illustration.
- Seconds spent on the completion card before **Next round**.
- Any question they ask without prompting.

Afterward, ask each person to explain the round's gene–mechanism–clinical connection in their own words. This is an observation for design, not evidence that the game improves learning.

For trainees, also ask what the inheritance label does and does not tell a family, and why recognizing a gene does not establish a diagnosis. Revisit one connection after another round to look for retention; keep this facilitator exercise outside the game. Confirm that an unfamiliar symbol such as SLC29A3 does not prevent a satisfying image-puzzle completion.

Simulate the booth once: three people in a row on one device, standing, in a noisy room, with a two-minute limit, using **New player** between them.

## iPhone and Safari checklist

- Board, strip, and pieces fit on screen once the board is scrolled to the top.
- Taps on board positions do not zoom the page.
- Place a piece, then scroll or resize during its flight. The transient piece should disappear, the placed piece remain visible, and no late contact sound play.
- Portrait and landscape; Safari text size at 125% and 150%.
- Private Browsing (progress clears when the tab closes).
- Reduce Motion on: pieces place without movement and the completed image stays still. The guide shows a static takeaway; numbered image notes and **Revisit your clues** retain the explanations.
- Complete a round and check that the original illustration lifts with a brief perimeter glow and light sweep, then floats while its components move. Pause during the glow and resume: the entrance should continue, not restart. Scroll the board offscreen and return; playback should remain paused until resumed.
- Open an image note immediately after the final piece lands. The illustration must stay still for reading. Try restarting while the illustration is loading, and opening and closing a dialog during completion. No delayed animation should override these actions.
- Enable reduced motion while the illustration is playing. The frame and artwork should return to their static state. Returning to a previously completed round should also remain still until Play is selected.
- On a fresh completion, follow the three highlights and captions on the original image. They should finish once, leaving ambient motion and an image takeaway. **Follow the image** or **Replay guide** restarts the guide; pause freezes both guide and illustration. Opening a dialog or leaving the tab pauses playback.
- Check that the completion summary shows the gene, condition, and **One connection to remember** beside the image on a laptop and directly below it on a phone. **Clinical context** and **Revisit your clues** should expand without duplicating the summary.
- Complete a round in **Focus view**. The final piece should land without the board changing size; the illustration guide should remain accessible below it.
- Watch the first second in rounds 01 and 02: particles should depart gradually without teleporting or vanishing. Observe one full cycle: source resets happen while cargo is invisible, and surface highlights remain attached to moving structures. Pause and confirm all motion stops together.
- Enlarge the completed illustration. Playing artwork should continue; paused artwork should remain paused. Close or press Escape and confirm the same board and controls return to their original positions, with focus on Enlarge illustration. On a phone, enlarging must not shrink the image. Restart afterward.
- Follow the **GREGoR Stanford Site** link; return to the game. Check Play, Collection, and Science on a narrow screen, then open Editorial review from Science.
- Follow a reference number on a completion card and in Editorial review; the References panel should open at the cited item. Check that each external paper is listed once per round.
- Try ENT3 in round 03 and confirm it completes the image and explains why SLC29A3 fits the clues. Search Science for ENT3 and H syndrome. Before placing pieces, request all three gene hints: location/function, the solute-carrier connection, and symbol. Enter an incorrect answer, reopen the bank, and reload; all hints should remain available and the count should stay at three.
- Request hints and select a piece before placing it: Practice/Timed should remain selectable and the clock should not start. A correct placement locks the mode and starts a timed clock. Reload during play: remaining piece order and letters must remain unchanged.
- Complete two rounds, open the field guide from Collection, and print to PDF. Only the completed rounds should appear, with readable figures and references.
- Verify sound starts on, muting persists after reload, and New player restores sound to on. Verify no sound occurs on page load.
- Mute or restart during a piece flight or completion sound. No delayed placement or completion audio should follow. Confirm sounds align with piece contact when enabled.
- Complete the collection and scroll to the completion banner: the logo assembles once, without moving the board.
- VoiceOver: complete one round; pieces announce their position.
- Airplane mode after loading: switch rounds and note what fails.
- Connect the phone to a Mac and use Safari Web Inspector for console errors.

Scientific sign-off, physical iPhone/Safari checks, VoiceOver testing, and testing on the final booth hardware remain pending. Browser-width checks do not replace these steps.

For animation edge checks, compare each round before playback with paused frames early and late in its cycle, including the enlarged view. Look for trimmed outlines, stationary duplicate edges, background-colored cutout rims, collisions with fixed molecules, and a visible reset. Specifically inspect the round 07 blue/purple proteins, round 06 free-vesicle rims, and round 10 thin neuron branches. Passing timing tests alone does not verify these visual boundaries.
