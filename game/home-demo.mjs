import {pathFor, SIZE, W, H} from './puzzle-geometry.mjs';

const activeDemos = new WeakMap();
const SVG_NS = 'http://www.w3.org/2000/svg';
const MISSING = 6;
const REST = {x: 560, y: 30};
const SLOT = {x: 400, y: 200};
const CLUE = 'Chloride channels help stabilize the electrical activity of muscle cells.';
const INSTRUCTION = 'Tap or drag the final piece into place.';
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

export function initHomeDemo(host = document.getElementById('homeDemo')) {
  if (!host) return null;
  activeDemos.get(host)?.destroy();
  const controller = new AbortController();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {phase: 'loading', visible: false, reduced: media.matches, alive: true, run: 0, drag: null, suppressClick: false, animations: new Set()};
  const prefix = `home-demo-${++nextId}`;
  const fallback = host.querySelector('img');
  const source = fallback?.getAttribute('src') || './artwork/01.webp';
  const image = fallback || new Image();
  if (!fallback) image.src = source;
  let observer, resizeObserver, board, piece, pieceTag, place, replay, explore, status, heading, count, clue, clueLabel, marker, illustration, seams, highlight, motion, motionLabel;
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
    if (!state.visible || document.hidden) animation.pause();
    return animation.finished.catch(() => {}).finally(() => {
      state.animations.delete(animation);
      animation.cancel();
    });
  }
  function syncMotion() {
    for (const animation of state.animations) {
      if (state.visible && !document.hidden) animation.play();
      else animation.pause();
    }
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
  function replayDemo() {
    state.run++;
    cancelAnimations();
    if (state.drag && piece.hasPointerCapture?.(state.drag.id)) piece.releasePointerCapture(state.drag.id);
    state.drag = null;
    state.suppressClick = false;
    resetPiece();
    pieceTag.hidden = false;
    board.setAttribute('aria-label', BOARD_DESCRIPTION);
    setPhase('ready');
    heading.textContent = 'Place the final piece';
    count.textContent = '11 of 12';
    illustration.style.opacity = '0';
    seams.style.opacity = '';
    highlight.style.opacity = '0';
    motion.style.opacity = '0';
    motionLabel.hidden = true;
    marker.hidden = true;
    clue.classList.remove('demo-clue-revealed');
    clueLabel.textContent = 'A discovery is one piece away.';
    clue.querySelector('.demo-clue-copy').textContent = INSTRUCTION;
    place.hidden = false;
    place.removeAttribute('aria-disabled');
    explore.hidden = true;
    replay.disabled = true;
    status.textContent = 'Preview ready. Place the final piece.';
  }

  async function revealClue(run) {
    if (!state.alive || run !== state.run) return;
    marker.hidden = false;
    marker.style.left = `${board.offsetLeft + board.clientWidth * .55}px`;
    marker.style.top = `${board.offsetTop + board.clientHeight * .45}px`;
    const origin = marker.getBoundingClientRect();
    const destination = clueLabel.getBoundingClientRect();
    if (!state.reduced) {
      await animate(marker, [
        {opacity: 0, transform: 'translate(0, 8px) scale(.94)', offset: 0},
        {opacity: 1, transform: 'translate(0, 0) scale(1)', offset: .2},
        {opacity: 1, transform: 'translate(0, 0) scale(1)', offset: .5},
        {opacity: 0, transform: `translate(${destination.left - origin.left}px, ${destination.top - origin.top}px) scale(.9)`, offset: 1}
      ], {duration: 1050, easing: 'cubic-bezier(.22,.72,.25,1)', fill: 'both'});
    }
    if (!state.alive || run !== state.run) return;
    marker.hidden = true;
    clue.classList.add('demo-clue-revealed');
    clueLabel.textContent = 'Chloride channel';
    clue.querySelector('.demo-clue-copy').textContent = CLUE;
    status.textContent = `Puzzle complete. ${CLUE}`;
    void animate(clue, [{opacity: .35, transform: 'translateY(5px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 330, easing: 'ease-out'});
  }

  async function scientificMotion(run) {
    if (state.reduced || !state.alive || run !== state.run) return;
    motionLabel.hidden = false;
    await Promise.all([
      animate(highlight, [{opacity: 0}, {opacity: .8, offset: .22}, {opacity: .35, offset: .6}, {opacity: 0}], {duration: 1800, easing: 'ease-in-out'}),
      animate(motion, [{opacity: 0}, {opacity: 1, offset: .16}, {opacity: 1, offset: .78}, {opacity: 0}], {duration: 3100}),
      ...[...motion.querySelectorAll('.demo-ion')].map((ion, index) => animate(ion, [
        {transform: 'translateY(0)'},
        {transform: `translateY(${index ? -58 : 58}px)`, offset: .5},
        {transform: 'translateY(0)'}
      ], {duration: 2700, delay: 200, easing: 'ease-in-out'}))
    ]);
    if (state.alive && run === state.run) motionLabel.hidden = true;
  }

  async function completePiece() {
    if (state.phase !== 'ready') return;
    const run = ++state.run;
    const keepFocus = document.activeElement === piece || document.activeElement === place;
    const startTransform = piece.style.transform || 'translate(0, 0)';
    setPhase('snapping');
    pieceTag.hidden = true;
    state.drag = null;
    piece.classList.remove('demo-piece-dragging');
    piece.setAttribute('aria-disabled', 'true');
    place.setAttribute('aria-disabled', 'true');
    const dx = (SLOT.x - REST.x) * board.clientWidth / W;
    const dy = (SLOT.y - REST.y) * board.clientHeight / H;
    await animate(piece, [
      {transform: startTransform, filter: 'drop-shadow(0 10px 8px #15336b30)'},
      {transform: `translate(${dx}px, ${dy}px)`, filter: 'drop-shadow(0 1px 1px #15336b12)'}
    ], {duration: 420, easing: 'cubic-bezier(.22,.8,.28,1)', fill: 'forwards'});
    if (!state.alive || run !== state.run) return;
    piece.hidden = true;
    illustration.style.opacity = '1';
    setPhase('complete');
    board.setAttribute('aria-label', 'A completed puzzle showing a chloride channel in a muscle-cell membrane.');
    heading.textContent = 'The picture becomes a clue';
    count.textContent = '12 of 12';
    place.hidden = true;
    explore.hidden = false;
    replay.disabled = false;
    if (keepFocus) explore.focus({preventScroll: true});
    void animate(seams, [{opacity: 1}, {opacity: 0}], {duration: 650, fill: 'forwards'}).then(() => {
      if (state.alive && run === state.run) seams.style.opacity = '0';
    });
    void revealClue(run);
    void scientificMotion(run);
  }

  function mount() {
    if (!state.alive || state.phase !== 'loading') return;
    host.classList.add('home-demo');
    host.replaceChildren();
    const bar = html('div', 'demo-bar');
    heading = html('span', 'demo-instruction', 'Place the final piece');
    heading.id = `${prefix}-instruction`;
    count = html('span', 'demo-count', '11 of 12');
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
    const slot = svg('path', {d: pathFor(MISSING), class: 'demo-slot'});
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
    scene.append(defs, slot, assembled, illustration, seams, highlight, motion);
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
    pieceTag = html('span', 'demo-piece-tag', 'Your last piece');
    pieceTag.hidden = false;
    pieceTag.setAttribute('aria-hidden', 'true');
    motionLabel = html('span', 'demo-motion-label', 'Schematic ion motion · both directions');
    motionLabel.hidden = true;
    board.append(scene, piece, pieceTag, motionLabel);
    clue = html('div', 'demo-clue');
    clueLabel = html('p', 'demo-clue-label', 'A discovery is one piece away.');
    clue.append(clueLabel, html('p', 'demo-clue-copy', INSTRUCTION));
    const controls = html('div', 'demo-controls');
    place = html('button', 'demo-place', 'Place piece');
    place.type = 'button';
    const arrow = html('span', 'demo-control-arrow', '↘');
    arrow.setAttribute('aria-hidden', 'true');
    place.append(arrow);
    explore = html('a', 'demo-explore', 'Explore the full puzzle →');
    explore.href = './play.html?level=01';
    explore.hidden = true;
    replay = html('button', 'demo-replay', 'Replay');
    replay.type = 'button';
    replay.disabled = true;
    replay.setAttribute('aria-label', 'Replay the puzzle preview');
    controls.append(place, explore, replay);
    marker = html('span', 'demo-clue-marker', 'Chloride channel');
    marker.hidden = true;
    marker.setAttribute('aria-hidden', 'true');
    status = html('p', 'demo-sr-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    host.append(bar, board, clue, controls, marker, status);
    setPhase('ready');
    on(place, 'click', completePiece);
    on(replay, 'click', () => {replayDemo(); place.focus({preventScroll: true});});
    on(piece, 'click', event => {
      if (event.detail && state.suppressClick) return;
      void completePiece();
    });
    on(piece, 'pointerdown', event => {
      if (state.phase !== 'ready' || !event.isPrimary || event.button !== 0) return;
      const point = demoPoint(event.clientX, event.clientY, board.getBoundingClientRect());
      if (!point) return;
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
      // Keep the piece within the board while maintaining a one-to-one image scale.
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
        // Finish user-triggered actions immediately; cancelling resolves their await.
        cancelAnimations();
        motionLabel.hidden = true;
      }
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        state.visible = entries[0].isIntersecting;
        if (state.visible) host.dataset.activated = 'true';
        syncMotion();
      }, {threshold: .12});
      observer.observe(host);
    } else {state.visible = true; host.dataset.activated = 'true';}
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
        // A viewport change cannot leave a translated piece or clue out of register.
        cancelAnimations();
      });
      resizeObserver.observe(board);
    }
  }

  const api = {
    get state() {return state.phase;},
    replay() {if (board) replayDemo();},
    destroy() {
      state.alive = false;
      state.run++;
      controller.abort();
      cancelAnimations();
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
