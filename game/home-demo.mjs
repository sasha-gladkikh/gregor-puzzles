import {pathFor, SIZE, W, H} from './puzzle-geometry.mjs';
import {illustrations} from './artwork-data.mjs';
import {soundFeedback} from './experience.mjs';

const activeDemos = new WeakMap();
const SVG_NS = 'http://www.w3.org/2000/svg';
const MISSING = 6;
const REST = {x: 560, y: 30};
const SLOT = {x: 400, y: 200};
const CLUE = 'Chloride channels help stabilize the electrical activity of muscle cells.';
const BOARD_DESCRIPTION = 'An almost completed puzzle of a channel in a muscle-cell membrane.';
let nextId = 0;

/** Convert a pointer into the artwork's stable, uncropped coordinate system. */
export function demoPoint(clientX, clientY, rect) {
  if (!(rect.width > 0 && rect.height > 0)) return null;
  return {x: (clientX - rect.left) * W / rect.width, y: (clientY - rect.top) * H / rect.height};
}

/** Generous snap tolerance, independent of viewport size or device pixel ratio. */
export function demoFits(x, y) {
  return Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x - SLOT.x, y - SLOT.y) <= 74;
}

/** Use the same destination as the main Play action; never write round progress. */
export function demoDestination(destination) {
  const fallback = {href: './play.html?level=01', label: 'Play your first puzzle'};
  if (typeof destination === 'string') destination = {href: destination};
  if (!destination || !/^\.\/(?:play|collection)\.html(?:[?#].*)?$/.test(destination.href ?? '')) return fallback;
  return {href: destination.href, label: typeof destination.label === 'string' && destination.label.trim() ? destination.label.trim() : fallback.label};
}

// The inspection lens deliberately uses the reviewed, anonymous play wording.
export function demoInspectionNotes() {
  return illustrations['01'].landmarks.map(({x, y, playTitle, playText}) => ({x, y, title: playTitle, text: playText}));
}

export function initHomeDemo(host = document.getElementById('homeDemo'), options = {}) {
  if (!host) return null;
  activeDemos.get(host)?.destroy();
  const controller = new AbortController();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {phase: 'loading', visible: false, reduced: media.matches, alive: true, run: 0, drag: null, suppressClick: false, animations: new Set(), interacted: false, invited: false, inspection: false};
  let destination = demoDestination(options.destination);
  const prefix = `home-demo-${++nextId}`;
  const fallback = host.querySelector('img');
  const source = fallback?.getAttribute('src') || './artwork/01.webp';
  const image = fallback || new Image();
  if (!fallback) image.src = source;
  let observer, resizeObserver, board, piece, place, replay, explore, status, heading, count, clue, clueLabel, marker, illustration, seams, highlight, motion, motionLabel, slot, perimeter, sound, invitationTimer, inspectionDialog, inspectButton;
  const on = (element, event, listener, options = {}) => element.addEventListener(event, listener, {...options, signal: controller.signal});
  const html = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = (tag, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  };
  const artwork = () => svg('image', {href: source, width: W, height: H, preserveAspectRatio: 'xMidYMid meet'});

  function cancelAnimations() {
    for (const animation of state.animations) animation.cancel();
    state.animations.clear();
  }
  function animate(element, frames, options) {
    if (state.reduced || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, options);
    state.animations.add(animation);
    if (!state.visible || document.hidden || state.inspection) animation.pause();
    return animation.finished.catch(() => {}).finally(() => {
      state.animations.delete(animation);
      animation.cancel();
    });
  }
  function syncMotion() {
    for (const animation of state.animations) {
      if (state.visible && !document.hidden && !state.inspection) animation.play();
      else animation.pause();
    }
    if (!state.visible || document.hidden || state.inspection) sound?.stop();
  }
  function stopInvitation() {
    state.interacted = true;
    clearTimeout(invitationTimer);
    if (state.phase === 'ready') cancelAnimations();
  }
  function invite() {
    if (state.invited || state.interacted || state.reduced || state.phase !== 'ready' || !state.visible) return;
    state.invited = true;
    invitationTimer = setTimeout(() => {
      if (!state.alive || state.interacted || !state.visible || document.hidden || state.phase !== 'ready') return;
      void animate(piece, [{transform: 'translateY(0)'}, {transform: 'translateY(-5px)', offset: .42}, {transform: 'translateY(0)'}], {duration: 900, easing: 'cubic-bezier(.25,.6,.35,1)'});
      void animate(slot, [{strokeOpacity: .6}, {strokeOpacity: 1, fill: '#d5e9ff', offset: .42}, {strokeOpacity: .6}], {duration: 900, easing: 'ease-in-out'});
    }, 1000);
  }
  function setPhase(phase) {
    state.phase = phase;
    host.dataset.state = phase;
  }
  function resetPiece() {
    if (!piece) return;
    piece.style.transform = '';
    piece.classList.remove('demo-piece-dragging');
    piece.hidden = false;
    piece.removeAttribute('aria-disabled');
  }
  function paintDestination() {
    if (!explore) return;
    explore.href = destination.href;
    explore.textContent = `${destination.label} →`;
  }
  function replayDemo() {
    state.run++;
    clearTimeout(invitationTimer);
    cancelAnimations();
    sound?.stop();
    if (state.drag && piece.hasPointerCapture?.(state.drag.id)) piece.releasePointerCapture(state.drag.id);
    state.drag = null;
    state.suppressClick = false;
    resetPiece();
    board.setAttribute('aria-label', BOARD_DESCRIPTION);
    setPhase('ready');
    heading.textContent = 'Place the final piece';
    count.textContent = '11 / 12';
    illustration.style.opacity = '0';
    seams.style.opacity = '';
    highlight.style.opacity = '0';
    motion.style.opacity = '0';
    motionLabel.hidden = true;
    marker.hidden = true;
    clue.hidden = true;
    place.hidden = false;
    place.removeAttribute('aria-disabled');
    explore.hidden = true;
    replay.hidden = true;
    status.textContent = 'Preview ready. Place the final piece.';
  }

  async function revealClue(run) {
    if (!state.alive || run !== state.run) return;
    clue.hidden = false;
    clueLabel.textContent = 'One image. A scientific connection.';
    clue.querySelector('.demo-clue-copy').textContent = CLUE;
    marker.hidden = false;
    marker.style.left = `${board.offsetLeft + board.clientWidth * .49}px`;
    marker.style.top = `${board.offsetTop + board.clientHeight * .44}px`;
    const origin = marker.getBoundingClientRect();
    const target = clueLabel.getBoundingClientRect();
    if (!state.reduced) {
      clue.style.opacity = '0';
      await animate(marker, [
        {opacity: 0, transform: 'translate(0, 4px) scale(.85)', offset: 0},
        {opacity: 1, transform: 'translate(0, 0) scale(1)', offset: .18},
        {opacity: 1, transform: 'translate(0, 0) scale(1)', offset: .38},
        {opacity: .7, transform: `translate(${(target.left - origin.left) * .52}px, ${(target.top - origin.top) * .35}px) scale(.9)`, offset: .72},
        {opacity: 0, transform: `translate(${target.left - origin.left}px, ${target.top - origin.top}px) scale(.55)`, offset: 1}
      ], {duration: 820, easing: 'cubic-bezier(.3,.65,.35,1)', fill: 'both'});
    }
    if (!state.alive || run !== state.run) return;
    marker.hidden = true;
    clue.style.opacity = '';
    status.textContent = `Puzzle complete. ${CLUE}`;
    if (state.visible && !document.hidden && !state.inspection) void sound.play('discovery');
    void animate(clue, [{opacity: .25, transform: 'translateY(4px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 300, easing: 'ease-out'});
  }

  async function scientificMotion(run) {
    if (state.reduced || !state.alive || run !== state.run) return;
    motionLabel.hidden = false;
    await Promise.all([
      animate(highlight, [{opacity: 0}, {opacity: .62, offset: .2}, {opacity: .22, offset: .62}, {opacity: 0}], {duration: 2800, easing: 'ease-in-out'}),
      animate(perimeter, [{strokeDashoffset: 1, opacity: .2}, {strokeDashoffset: 0, opacity: .8, offset: .65}, {strokeDashoffset: 0, opacity: 0}], {duration: 1500, easing: 'cubic-bezier(.25,.6,.3,1)'}),
      animate(board, [{boxShadow: 'inset 0 0 0 1px #72c9d000'}, {boxShadow: 'inset 0 0 24px 2px #72c9d025', offset: .45}, {boxShadow: 'inset 0 0 0 1px #72c9d000'}], {duration: 2000}),
      animate(motion, [{opacity: 0}, {opacity: 1, offset: .12}, {opacity: 1, offset: .85}, {opacity: 0}], {duration: 3900}),
      ...[...motion.querySelectorAll('.demo-ion')].map((ion, index) => animate(ion, [
        {transform: 'translateY(0)'},
        {transform: `translateY(${index ? -46 : 46}px)`, offset: .5},
        {transform: 'translateY(0)'}
      ], {duration: 3300, delay: index * 160, easing: 'cubic-bezier(.45,0,.55,1)'}))
    ]);
    if (state.alive && run === state.run) motionLabel.hidden = true;
  }

  async function completePiece() {
    if (state.phase !== 'ready') return;
    stopInvitation();
    void sound.prepare();
    const run = ++state.run;
    const keepFocus = document.activeElement === piece || document.activeElement === place;
    const startTransform = piece.style.transform || 'translate(0, 0)';
    setPhase('snapping');
    state.drag = null;
    piece.classList.remove('demo-piece-dragging');
    piece.setAttribute('aria-disabled', 'true');
    place.setAttribute('aria-disabled', 'true');
    const dx = (SLOT.x - REST.x) * board.clientWidth / W;
    const dy = (SLOT.y - REST.y) * board.clientHeight / H;
    await animate(piece, [
      {transform: startTransform, filter: 'drop-shadow(0 10px 8px #15336b30)'},
      {transform: `translate(${dx}px, ${dy}px)`, filter: 'drop-shadow(0 1px 1px #15336b12)'}
    ], {duration: 410, easing: 'cubic-bezier(.23,.8,.24,1)', fill: 'forwards'});
    if (!state.alive || run !== state.run) return;
    piece.hidden = true;
    illustration.style.opacity = '1';
    setPhase('complete');
    if (state.visible && !document.hidden && !state.inspection) {
      void sound.play('place', {progress: 1});
      void sound.play('complete', {delay: 160});
    }
    board.setAttribute('aria-label', 'A completed puzzle showing a chloride channel in a muscle-cell membrane.');
    heading.textContent = 'A connection revealed';
    count.textContent = '12 / 12';
    place.hidden = true;
    explore.hidden = false;
    replay.hidden = false;
    if (keepFocus) explore.focus({preventScroll: true});
    void animate(seams, [{opacity: 1}, {opacity: 0}], {duration: 600, fill: 'forwards'}).then(() => {
      if (state.alive && run === state.run) seams.style.opacity = '0';
    });
    void revealClue(run);
    void scientificMotion(run);
    options.onComplete?.();
  }

  function inspect() {
    stopInvitation();
    if (!inspectionDialog) {
      inspectionDialog = html('dialog', 'demo-inspection');
      inspectionDialog.setAttribute('aria-labelledby', `${prefix}-inspect-title`);
      const header = html('div', 'demo-inspection-head');
      const title = html('h2', '', 'Look closer');
      title.id = `${prefix}-inspect-title`;
      const close = html('button', 'demo-inspection-close', 'Close');
      close.type = 'button';
      header.append(title, close);
      const stage = html('div', 'demo-inspection-stage');
      const full = html('img', 'demo-inspection-image');
      full.src = './artwork/native/01.webp';
      full.width = W; full.height = H;
      full.alt = illustrations['01'].description;
      stage.append(full);
      const detail = html('div', 'demo-inspection-detail');
      detail.setAttribute('aria-live', 'polite');
      detail.setAttribute('aria-atomic', 'true');
      const noteTitle = html('h3'), noteText = html('p');
      detail.append(noteTitle, noteText);
      const notes = demoInspectionNotes();
      const buttons = [];
      const select = index => {
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
        noteTitle.textContent = notes[index].title;
        noteText.textContent = notes[index].text;
      };
      notes.forEach((note, i) => {
        const button = html('button', 'demo-inspection-marker', String(i + 1));
        button.type = 'button';
        button.style.left = `${note.x}%`; button.style.top = `${note.y}%`;
        button.setAttribute('aria-label', `${i + 1}. ${note.title}`);
        on(button, 'click', () => select(i));
        buttons.push(button); stage.append(button);
      });
      select(0);
      const foot = html('p', 'demo-inspection-caption', illustrations['01'].note);
      inspectionDialog.append(header, stage, detail, foot);
      document.body.append(inspectionDialog);
      on(close, 'click', () => inspectionDialog.close());
      on(inspectionDialog, 'click', event => {if (event.target === inspectionDialog) {const rect = inspectionDialog.getBoundingClientRect();if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) inspectionDialog.close();}});
      on(inspectionDialog, 'close', () => {state.inspection = false;syncMotion();inspectButton.focus({preventScroll: true});});
    }
    state.inspection = true;
    syncMotion();
    inspectionDialog.showModal();
    inspectionDialog.querySelector('.demo-inspection-close').focus({preventScroll: true});
  }

  function mount() {
    if (!state.alive || state.phase !== 'loading') return;
    host.classList.add('home-demo');
    host.replaceChildren();
    const bar = html('div', 'demo-bar');
    heading = html('span', 'demo-instruction', 'Place the final piece');
    heading.id = `${prefix}-instruction`;
    count = html('span', 'demo-count', '11 / 12');
    count.setAttribute('aria-hidden', 'true');
    bar.append(heading, count);
    board = html('div', 'demo-board');
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', BOARD_DESCRIPTION);
    const scene = svg('svg', {viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true', focusable: 'false', class: 'demo-scene'});
    const defs = svg('defs');
    const clip = svg('clipPath', {id: `${prefix}-assembled`});
    for (let i = 0; i < SIZE; i++) if (i !== MISSING) clip.append(svg('path', {d: pathFor(i)}));
    defs.append(clip);
    const assembled = artwork();
    assembled.setAttribute('clip-path', `url(#${prefix}-assembled)`);
    slot = svg('path', {d: pathFor(MISSING), class: 'demo-slot'});
    illustration = artwork();
    illustration.style.opacity = '0';
    illustration.classList.add('demo-complete-art');
    seams = svg('g', {class: 'demo-seams'});
    for (let i = 0; i < SIZE; i++) if (i !== MISSING) seams.append(svg('path', {d: pathFor(i)}));
    highlight = svg('ellipse', {cx: 440, cy: 254, rx: 156, ry: 134, class: 'demo-channel-highlight', opacity: 0});
    motion = svg('g', {class: 'demo-schematic-motion', opacity: 0});
    for (const [x, y] of [[374, 217], [495, 283]]) {
      const ion = svg('g', {class: 'demo-ion'});
      ion.append(svg('circle', {cx: x, cy: y, r: 7}), svg('path', {d: `M ${x - 3} ${y} H ${x + 3}`}));
      motion.append(ion);
    }
    perimeter = svg('rect', {x: 2, y: 2, width: W - 4, height: H - 4, rx: 2, pathLength: 1, class: 'demo-perimeter', opacity: 0});
    scene.append(defs, slot, assembled, illustration, seams, highlight, motion, perimeter);
    piece = html('button', 'demo-piece-button');
    piece.type = 'button';
    piece.setAttribute('aria-label', 'Place the final puzzle piece');
    piece.setAttribute('aria-describedby', heading.id);
    const pieceSvg = svg('svg', {viewBox: '400 200 200 200', width: 200, height: 200, 'aria-hidden': 'true', focusable: 'false'});
    const pieceDefs = svg('defs');
    const pieceClip = svg('clipPath', {id: `${prefix}-loose`});
    pieceClip.append(svg('path', {d: pathFor(MISSING)}));
    pieceDefs.append(pieceClip);
    const pieceArt = artwork();
    pieceArt.setAttribute('clip-path', `url(#${prefix}-loose)`);
    pieceSvg.append(pieceDefs, pieceArt, svg('path', {d: pathFor(MISSING), class: 'demo-piece-edge'}));
    piece.append(pieceSvg);
    motionLabel = html('span', 'demo-motion-label', 'Schematic ion motion · both directions');
    motionLabel.hidden = true;
    board.append(scene, piece, motionLabel);
    clue = html('div', 'demo-clue');
    clue.hidden = true;
    clueLabel = html('p', 'demo-clue-label');
    clue.append(clueLabel, html('p', 'demo-clue-copy'));
    const controls = html('div', 'demo-controls');
    place = html('button', 'demo-place', 'Place piece');
    place.type = 'button';
    const arrow = html('span', 'demo-control-arrow', '↘');
    arrow.setAttribute('aria-hidden', 'true');
    place.append(arrow);
    explore = html('a', 'demo-explore');
    paintDestination();
    explore.hidden = true;
    const tools = html('div', 'demo-tools');
    inspectButton = html('button', 'demo-inspect', 'Look closer');
    inspectButton.type = 'button';
    inspectButton.setAttribute('aria-haspopup', 'dialog');
    replay = html('button', 'demo-replay', 'Replay');
    replay.type = 'button';
    replay.hidden = true;
    replay.setAttribute('aria-label', 'Replay the puzzle preview');
    const soundButton = html('button', 'demo-sound');
    soundButton.type = 'button';
    const soundIcon = svg('svg', {viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false'});
    soundIcon.append(svg('path', {d: 'M11 5 6 9H3v6h3l5 4V5Z'}), svg('path', {d: 'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14', class: 'demo-sound-waves'}));
    soundButton.append(soundIcon, html('span', 'demo-sr-status', 'Sound on'));
    sound = soundFeedback(soundButton);
    tools.append(inspectButton, replay, soundButton);
    controls.append(place, explore, tools);
    marker = html('span', 'demo-clue-marker', 'Chloride channel');
    marker.hidden = true;
    marker.setAttribute('aria-hidden', 'true');
    status = html('p', 'demo-sr-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    host.append(bar, board, clue, controls, marker, status);
    setPhase('ready');
    on(host, 'pointerdown', stopInvitation, {capture: true});
    on(host, 'keydown', stopInvitation, {capture: true});
    on(place, 'click', completePiece);
    on(replay, 'click', () => {replayDemo(); place.focus({preventScroll: true});});
    on(inspectButton, 'click', inspect);
    on(piece, 'click', event => {
      if (event.detail && state.suppressClick) return;
      void completePiece();
    });
    on(piece, 'pointerdown', event => {
      if (state.phase !== 'ready' || !event.isPrimary || event.button !== 0) return;
      const point = demoPoint(event.clientX, event.clientY, board.getBoundingClientRect());
      if (!point) return;
      void sound.prepare();
      cancelAnimations();
      piece.style.transform = '';
      state.suppressClick = false;
      state.drag = {id: event.pointerId, x: point.x, y: point.y, moved: false, dx: 0, dy: 0};
      piece.setPointerCapture(event.pointerId);
    });
    on(piece, 'pointermove', event => {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const point = demoPoint(event.clientX, event.clientY, board.getBoundingClientRect());
      if (!point) return;
      drag.dx = (point.x - drag.x) * board.clientWidth / W;
      drag.dy = (point.y - drag.y) * board.clientHeight / H;
      if (Math.hypot(drag.dx, drag.dy) > 5) drag.moved = true;
      if (!drag.moved) return;
      drag.dx = Math.max(-REST.x * board.clientWidth / W, Math.min((W - REST.x - 200) * board.clientWidth / W, drag.dx));
      drag.dy = Math.max(-REST.y * board.clientHeight / H, Math.min((H - REST.y - 200) * board.clientHeight / H, drag.dy));
      piece.style.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
      piece.classList.add('demo-piece-dragging');
    });
    const stopDrag = (event, cancelled = false) => {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
      piece.classList.remove('demo-piece-dragging');
      if (!drag.moved) return;
      state.suppressClick = true;
      const x = REST.x + drag.dx * W / board.clientWidth;
      const y = REST.y + drag.dy * H / board.clientHeight;
      if (!cancelled && demoFits(x, y)) void completePiece();
      else {
        const from = piece.style.transform;
        piece.style.transform = '';
        void animate(piece, [{transform: from}, {transform: 'translate(0, 0)'}], {duration: 250, easing: 'ease-out'});
        if (!cancelled) status.textContent = 'Try the gap outlined in blue, or use Place piece.';
      }
    };
    on(piece, 'pointerup', event => stopDrag(event));
    on(piece, 'pointercancel', event => stopDrag(event, true));
    on(piece, 'lostpointercapture', event => stopDrag(event, true));
    on(document, 'visibilitychange', syncMotion);
    on(media, 'change', event => {
      state.reduced = event.matches;
      if (state.reduced) {
        clearTimeout(invitationTimer);
        cancelAnimations();
        motionLabel.hidden = true;
      }
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        state.visible = entries[0].isIntersecting;
        syncMotion();
        invite();
      }, {threshold: .12});
      observer.observe(host);
    } else {state.visible = true; invite();}
    if ('ResizeObserver' in window) {
      let previousWidth = board.clientWidth;
      resizeObserver = new ResizeObserver(() => {
        if (previousWidth === board.clientWidth) return;
        previousWidth = board.clientWidth;
        if (state.drag) {
          const id = state.drag.id;
          state.drag = null;
          if (piece.hasPointerCapture(id)) piece.releasePointerCapture(id);
          resetPiece();
        }
        cancelAnimations();
      });
      resizeObserver.observe(board);
    }
  }

  const api = {
    get state() {return state.phase;},
    setDestination(value) {destination = demoDestination(value);paintDestination();},
    replay() {if (board) replayDemo();},
    destroy() {
      state.alive = false;
      state.run++;
      controller.abort();
      clearTimeout(invitationTimer);
      cancelAnimations();
      sound?.stop();
      sound?.dispose?.();
      inspectionDialog?.remove();
      observer?.disconnect();
      resizeObserver?.disconnect();
      activeDemos.delete(host);
    }
  };
  activeDemos.set(host, api);
  if (image.complete && image.naturalWidth) mount();
  else on(image, 'load', mount, {once: true});
  return api;
}
