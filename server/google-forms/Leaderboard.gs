/**
 * Account-free, opt-in player leaderboard. Kept separate from suggestion data.
 * Only setupLeaderboard() creates the private event form; public requests never
 * create forms or read the suggestion form. Clients retain their own bearer key.
 */
const PLAYER_SCHEMA = 'gregor-player-v1';
const PLAYER_BOARD_SCHEMA = 'gregor-player-board-v1';
const PLAYER_FORM_PROPERTY = 'GREGOR_LEADERBOARD_FORM_ID';
const PLAYER_SIGNING_PROPERTY = 'GREGOR_LEADERBOARD_SIGNING_KEY';
const PLAYER_HIDDEN_PROPERTY = 'GREGOR_LEADERBOARD_HIDDEN_PLAYERS';
const PLAYER_EXCLUDED_ATTEMPTS_PROPERTY = 'GREGOR_LEADERBOARD_EXCLUDED_ATTEMPTS';
const PLAYER_REPORTED_RESULTS_PROPERTY = 'GREGOR_LEADERBOARD_REPORTED_RESULTS';
const PLAYER_CACHE_KEY = 'gregor:player-board:v1';
const PLAYER_ROUNDS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const PLAYER_MAX_EVENTS = 20000;
const PLAYER_MAX_BYTES = 20000;
const PLAYER_MAX_SECONDS = 604800;
const PLAYER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Run manually as the script owner. Its private editor URL is never a web response.
function setupLeaderboard() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Leaderboard setup is busy.');
  try {
    const properties = PropertiesService.getScriptProperties();
    let id = properties.getProperty(PLAYER_FORM_PROPERTY);
    if (id === SUGGESTION_FORM_ID) throw new Error('Leaderboard and suggestions must use different forms.');
    if (id && !properties.getProperty(PLAYER_SIGNING_PROPERTY)) {
      throw new Error('The existing leaderboard signing key is missing. Restore it before setup; do not replace its event history.');
    }
    if (!id) {
      const form = FormApp.create('GREGoR Puzzles · Private leaderboard events', false);
      form.setCollectEmail(false).setPublishingSummary(false)
        .setLimitOneResponsePerUser(false).setAllowResponseEdits(false)
        .setShowLinkToRespondAgain(false);
      form.addParagraphTextItem().setTitle('Leaderboard event').setRequired(true);
      id = form.getId();
      properties.setProperty(PLAYER_FORM_PROPERTY, id);
    }
    if (!properties.getProperty(PLAYER_SIGNING_PROPERTY)) {
      // Never rotate this key without migrating the signed event history.
      properties.setProperty(PLAYER_SIGNING_PROPERTY, Utilities.getUuid() + Utilities.getUuid());
    }
    const store = playerForm_(properties);
    const editUrl = store.form.getEditUrl();
    console.log('Private leaderboard form editor: ' + editUrl);
    if ((store.form.supportsAdvancedResponderPermissions() && !store.form.isPublished()) || !store.form.isAcceptingResponses()) {
      throw new Error('In the form editor above, restrict responder access to the owner, then publish the form and enable responses. Keep response summaries off. Run setupLeaderboard again. Setup never publishes or broadens access automatically.');
    }
    // Google requires a published, accepting form even for owner-side writes.
    // Configure its responder access manually to the owner before this probe.
    // Delete only this probe, never any player's durable event history.
    const probe = store.form.createResponse().withItemResponse(store.item.createResponse('{"setupProbe":true}')).submit();
    if (!probe || !probe.getId()) throw new Error('Private leaderboard write could not be confirmed.');
    store.form.deleteResponse(probe.getId());
    console.log('Private leaderboard form ready: ' + editUrl);
    return {ok: true, service: 'gregor-player-leaderboard', editUrl: editUrl};
  } finally { lock.releaseLock(); }
}

function playerHex_(bytes) {
  return bytes.map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function playerHash_(value) {
  return playerHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
}

function playerEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function playerKeys_(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every(function (key) { return keys.includes(key); });
}

function playerName_(value) {
  if (typeof value !== 'string') throw publicError_('Enter a display name of 2–32 characters.');
  const name = value.normalize('NFC').trim().replace(/ +/g, ' ');
  if (Array.from(name).length < 2 || Array.from(name).length > 32 ||
      !/^[\p{L}\p{N} ._'’\-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name) ||
      /(?:www\.|https?\b|\.[a-z]{2,}(?:\s|$))/i.test(name)) {
    throw publicError_('Use 2–32 letters, numbers, spaces, apostrophes, hyphens, dots or underscores. No email addresses or links.');
  }
  return name;
}

function playerIdentity_(input) {
  if (typeof input.playerId !== 'string' || !PLAYER_UUID.test(input.playerId) ||
      typeof input.token !== 'string' || !PLAYER_UUID.test(input.token)) {
    throw publicError_('Your player key is missing. Please join the leaderboard again.');
  }
  return {playerId: input.playerId.toLowerCase(), tokenHash: playerHash_(input.token.toLowerCase())};
}

function playerAttempt_(input, now) {
  const keys = ['id', 'roundNumber', 'revision', 'status', 'mode', 'route', 'pieces', 'startedAt',
    'finishedAt', 'seconds', 'hints', 'peeks', 'geneHintsSeen', 'eligible'];
  if (!playerKeys_(input, keys) || typeof input.id !== 'string' || !PLAYER_UUID.test(input.id) ||
      !PLAYER_ROUNDS.includes(input.roundNumber) || !Number.isSafeInteger(input.revision) || input.revision < 1 ||
      !['active', 'completed', 'restarted'].includes(input.status) || !['practice', 'timed'].includes(input.mode) ||
      !['image', 'gene'].includes(input.route) || !Number.isInteger(input.pieces) || input.pieces < 0 || input.pieces > 12 ||
      (input.pieces === 0 && !(input.status === 'completed' && input.route === 'gene')) ||
      !Number.isSafeInteger(input.startedAt) || input.startedAt < 1 || input.startedAt > now + 300000 ||
      typeof input.eligible !== 'boolean') throw publicError_('This attempt could not be read. Please refresh and try again.');
  ['hints', 'peeks', 'geneHintsSeen'].forEach(function (key) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > (key === 'geneHintsSeen' ? 3 : 100000)) {
      throw publicError_('The attempt assistance counts are invalid.');
    }
  });
  if (input.status === 'active') {
    if (input.finishedAt !== null || input.eligible || input.route !== 'image') throw publicError_('An unfinished attempt cannot be ranked.');
  } else if (!Number.isSafeInteger(input.finishedAt) || input.finishedAt < input.startedAt || input.finishedAt > now + 300000) {
    throw publicError_('The attempt timing is invalid.');
  }
  if (input.mode === 'practice') {
    if (input.seconds !== null || input.eligible) throw publicError_('Practice attempts do not have leaderboard times.');
  } else {
    if (input.seconds !== null && (!Number.isFinite(input.seconds) || input.seconds < 0 ||
        input.seconds > Math.max(0, (now + 300000 - input.startedAt) / 1000) + 0.25)) {
      throw publicError_('The attempt time is outside the supported range.');
    }
    if (input.status !== 'active' && (input.seconds === null ||
        Math.abs((input.finishedAt - input.startedAt) / 1000 - input.seconds) > 0.25)) {
      throw publicError_('The attempt time does not match its start and finish.');
    }
  }
  if (input.status === 'completed' && input.route === 'image' && input.pieces !== 12) {
    throw publicError_('A completed image puzzle must contain all 12 pieces.');
  }
  if (input.route === 'gene' && input.status !== 'completed') throw publicError_('Gene completion requires a completed round.');
  if (input.eligible && !(input.status === 'completed' && input.mode === 'timed' && input.route === 'image' &&
      input.pieces === 12 && input.seconds >= 1 && input.seconds <= PLAYER_MAX_SECONDS)) {
    throw publicError_('Only completed timed image puzzles can enter the time ranking.');
  }
  const result = {};
  keys.forEach(function (key) { result[key] = key === 'id' ? input[key].toLowerCase() : input[key]; });
  return result;
}

function playerPayload_(event) {
  const post = event && event.postData;
  if (!post || typeof post.contents !== 'string' || !/^text\/plain(?:\s*;|$)/i.test(post.type || '') ||
      post.contents.length > PLAYER_MAX_BYTES || Number(event.contentLength) > PLAYER_MAX_BYTES ||
      Utilities.newBlob(post.contents).getBytes().length > PLAYER_MAX_BYTES) {
    throw publicError_('Please send leaderboard updates from the game.');
  }
  let input;
  try { input = JSON.parse(post.contents); } catch (_) { throw publicError_('The leaderboard request could not be read.'); }
  const fields = input && input.action === 'profile' ? ['displayName', 'revision'] : input && input.action === 'attempts' ? ['attempts'] : ['revision'];
  if (!playerKeys_(input, ['schema', 'action', 'playerId', 'token'].concat(fields)) || input.schema !== PLAYER_SCHEMA ||
      !['profile', 'attempts', 'leave'].includes(input.action)) throw publicError_('The leaderboard request is unsupported.');
  const identity = playerIdentity_(input);
  const result = {action: input.action, playerId: identity.playerId, tokenHash: identity.tokenHash};
  if (input.action !== 'attempts') {
    if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw publicError_('The player update revision is invalid. Please refresh and try again.');
    result.revision = input.revision;
  }
  if (input.action === 'profile') result.displayName = playerName_(input.displayName);
  if (input.action === 'attempts') {
    if (!Array.isArray(input.attempts) || input.attempts.length < 1 || input.attempts.length > 20) {
      throw publicError_('Send 1–20 attempts at a time.');
    }
    const ids = new Set();
    result.attempts = input.attempts.map(function (attempt) {
      const record = playerAttempt_(attempt, Date.now());
      if (ids.has(record.id)) throw publicError_('The same attempt appeared twice in this update.');
      ids.add(record.id);
      return record;
    });
  }
  return result;
}

function playerForm_(properties) {
  const id = properties.getProperty(PLAYER_FORM_PROPERTY);
  if (!id || id === SUGGESTION_FORM_ID || !properties.getProperty(PLAYER_SIGNING_PROPERTY)) {
    throw publicError_('The leaderboard is temporarily unavailable. Your attempts remain on this device.');
  }
  // This is the only form opened by leaderboard reads and writes.
  const form = FormApp.openById(id);
  const items = form.getItems();
  if (items.length !== 1 || items[0].getTitle() !== 'Leaderboard event' ||
      items[0].getType() !== FormApp.ItemType.PARAGRAPH_TEXT || !items[0].asParagraphTextItem().isRequired() ||
      form.collectsEmail() || form.isPublishingSummary()) throw new Error('Private leaderboard form configuration changed.');
  return {form: form, item: items[0].asParagraphTextItem()};
}

function playerTransition_(previous, next) {
  if (!previous) return true;
  if (next.revision < previous.revision) return false; // A delayed request cannot overwrite newer progress.
  if (next.revision === previous.revision) {
    if (JSON.stringify(previous) !== JSON.stringify(next)) throw publicError_('This attempt revision conflicts with an earlier update.');
    return false;
  }
  if (previous.roundNumber !== next.roundNumber || previous.mode !== next.mode || previous.startedAt !== next.startedAt ||
      next.pieces < previous.pieces || next.hints < previous.hints || next.peeks < previous.peeks ||
      next.geneHintsSeen < previous.geneHintsSeen ||
      (previous.seconds !== null && next.seconds !== null && next.seconds < previous.seconds)) {
    throw publicError_('An attempt cannot move backwards. Restart the round to create a new attempt.');
  }
  if (previous.status !== 'active') {
    const unchanged = Object.keys(previous).every(function (key) { return key === 'revision' || previous[key] === next[key]; });
    if (!unchanged) throw publicError_('A finished attempt cannot be changed. Restart the round to try again.');
  }
  return true;
}

function playerProfileTransition_(previous, next) {
  if (!previous) return true;
  if (next.revision < previous.revision) return false;
  if (next.revision === previous.revision) {
    if (next.action !== previous.action || (next.action === 'profile' && next.displayName !== previous.displayName)) {
      throw publicError_('This player update conflicts with an earlier change. Please refresh and try again.');
    }
    return false;
  }
  return true;
}

function playerRead_(store, properties) {
  const responses = store.form.getResponses();
  if (responses.length >= PLAYER_MAX_EVENTS) throw publicError_('The leaderboard needs maintenance. Your attempts remain on this device.');
  const key = properties.getProperty(PLAYER_SIGNING_PROPERTY);
  const players = new Map(), attempts = new Map(), seen = new Set();
  responses.forEach(function (response) {
    const values = response.getItemResponses();
    if (values.length !== 1 || values[0].getItem().getTitle() !== 'Leaderboard event') return;
    let envelope;
    try { envelope = JSON.parse(values[0].getResponse()); } catch (_) { return; }
    if (!playerKeys_(envelope, ['body', 'signature']) || typeof envelope.body !== 'string' ||
        envelope.body.length > PLAYER_MAX_BYTES || typeof envelope.signature !== 'string') return;
    const signature = playerHex_(Utilities.computeHmacSha256Signature(envelope.body, key, Utilities.Charset.UTF_8));
    if (!playerEqual_(signature, envelope.signature)) return; // Native-form injections are never trusted.
    let entry;
    try { entry = JSON.parse(envelope.body); } catch (_) { throw new Error('Signed event is invalid.'); }
    if (!entry || entry.version !== 1 || !PLAYER_UUID.test(entry.eventId) || !PLAYER_UUID.test(entry.playerId) ||
        !Number.isSafeInteger(entry.receivedAt)) throw new Error('Signed event schema changed.');
    if (seen.has(entry.eventId)) return;
    seen.add(entry.eventId);
    const player = players.get(entry.playerId);
    if (entry.action === 'profile' || entry.action === 'leave') {
      if (typeof entry.tokenHash !== 'string' || !/^[0-9a-f]{64}$/.test(entry.tokenHash) ||
          !Number.isSafeInteger(entry.revision) || entry.revision < 1 ||
          (entry.action === 'profile' && playerName_(entry.displayName) !== entry.displayName) ||
          (player && !playerEqual_(player.tokenHash, entry.tokenHash))) {
        throw new Error('Signed profile is invalid.');
      }
      if (playerProfileTransition_(player, entry)) {
        players.set(entry.playerId, {id: entry.playerId, displayName: entry.action === 'profile' ? entry.displayName : '',
          tokenHash: entry.tokenHash, joined: entry.action === 'profile', revision: entry.revision, action: entry.action});
      }
    } else if (entry.action === 'attempts') {
      if (!player || !player.joined || !Array.isArray(entry.attempts) || entry.attempts.length < 1 || entry.attempts.length > 20) {
        throw new Error('Signed attempts are invalid.');
      }
      entry.attempts.forEach(function (record) {
        const attempt = playerAttempt_(record, Math.max(Date.now(), entry.receivedAt));
        const previous = attempts.get(attempt.id);
        if (previous && previous.playerId !== entry.playerId) throw new Error('Signed attempt owner changed.');
        if (playerTransition_(previous && previous.record, attempt)) attempts.set(attempt.id, {playerId: entry.playerId, record: attempt});
      });
    } else throw new Error('Signed event action is invalid.');
  });
  return {players: players, attempts: attempts, eventCount: responses.length};
}

function playerAppend_(store, properties, entry) {
  entry.version = 1;
  entry.eventId = Utilities.getUuid();
  entry.receivedAt = Date.now();
  const body = JSON.stringify(entry);
  const signature = playerHex_(Utilities.computeHmacSha256Signature(body, properties.getProperty(PLAYER_SIGNING_PROPERTY), Utilities.Charset.UTF_8));
  // Invalidate before writing, including an uncertain save followed by a retry.
  try { CacheService.getScriptCache().remove(PLAYER_CACHE_KEY); } catch (_) { /* Cache expires in 30 seconds. */ }
  const saved = store.form.createResponse().withItemResponse(store.item.createResponse(JSON.stringify({body: body, signature: signature}))).submit();
  if (!saved || !saved.getId()) throw new Error('Leaderboard persistence could not be confirmed.');
  // Also clear after confirmation. Cache-miss readers share the writer lock,
  // so no reader can publish a pre-write snapshot while this append is pending.
  try { CacheService.getScriptCache().remove(PLAYER_CACHE_KEY); } catch (_) { /* Cache expires in 30 seconds. */ }
}

function leaderboardPost_(event) {
  let lock, locked = false;
  try {
    const input = playerPayload_(event);
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) throw publicError_('The leaderboard is busy. Please try again shortly.');
    const properties = PropertiesService.getScriptProperties();
    const store = playerForm_(properties);
    const state = playerRead_(store, properties);
    const previous = state.players.get(input.playerId);
    if (previous && !playerEqual_(previous.tokenHash, input.tokenHash)) throw publicError_('This player key does not match. Please use the device where you joined.');
    if (input.action === 'attempts' && (!previous || !previous.joined)) {
      throw publicError_('Join the leaderboard before sharing attempts.');
    }
    let entry = null;
    if (input.action !== 'attempts' && playerProfileTransition_(previous, input)) {
      // Even an unknown-player leave persists an authenticated tombstone. A
      // delayed, timed-out join with an older revision cannot make it public.
      entry = {action: input.action, playerId: input.playerId, tokenHash: input.tokenHash, revision: input.revision};
      if (input.action === 'profile') entry.displayName = input.displayName;
    }
    const accepted = [];
    if (input.action === 'attempts') {
      const changed = [];
      input.attempts.forEach(function (record) {
        const old = state.attempts.get(record.id);
        if (old && old.playerId !== input.playerId) throw publicError_('This attempt belongs to a different player.');
        if (playerTransition_(old && old.record, record)) changed.push(record);
        accepted.push({id: record.id, revision: record.revision});
      });
      if (changed.length) entry = {action: 'attempts', playerId: input.playerId, attempts: changed};
    }
    if (entry) {
      const cache = CacheService.getScriptCache();
      const minute = Math.floor(Date.now() / 60000);
      const globalKey = 'gregor:board-rate:' + minute;
      const personalKey = globalKey + ':' + input.playerId;
      const globalCount = Number(cache.get(globalKey) || 0), personalCount = Number(cache.get(personalKey) || 0);
      if (!Number.isFinite(globalCount) || !Number.isFinite(personalCount) || globalCount >= 240 || personalCount >= 30) {
        throw publicError_('The leaderboard is busy. Your attempts are saved on this device; please try again in a minute.');
      }
      playerAppend_(store, properties, entry);
      try { cache.put(globalKey, String(globalCount + 1), 120); cache.put(personalKey, String(personalCount + 1), 120); } catch (_) { /* The durable save already succeeded. */ }
    }
    const result = {ok: true, schema: PLAYER_SCHEMA, playerId: input.playerId};
    if (input.action === 'attempts') result.accepted = accepted;
    else result.revision = input.revision;
    return jsonOutput_(result);
  } catch (error) {
    return jsonOutput_({ok: false, schema: PLAYER_SCHEMA, error: error && error.isPublic ? error.message : 'We could not confirm the leaderboard update. Your attempts remain on this device. Please try again.'});
  } finally { if (lock && locked) { try { lock.releaseLock(); } catch (_) { /* Preserve the receipt. */ } } }
}

function playerModerationIds_(properties, property) {
  let ids;
  try { ids = JSON.parse(properties.getProperty(property) || '[]'); } catch (_) { throw new Error('Invalid moderation configuration.'); }
  if (!Array.isArray(ids) || ids.some(function (id) { return typeof id !== 'string' || !PLAYER_UUID.test(id); })) throw new Error('Invalid moderation configuration.');
  return new Set(ids.map(function (id) { return id.toLowerCase(); }));
}

// Owner-only maintenance helper; deliberately not a doGet/doPost action.
// Snapshot only currently known UUIDs whose actual start is at/before cutoff.
// New attempts remain eligible, even when they belong to the same player.
function excludePlayerAttemptsBefore_(playerId, cutoffMs) {
  if (typeof playerId !== 'string' || !PLAYER_UUID.test(playerId) ||
      !Number.isSafeInteger(cutoffMs) || cutoffMs < 1 || cutoffMs > Date.now()) {
    throw new Error('Supply a valid player UUID and a fixed cutoff timestamp in milliseconds, no later than now.');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Leaderboard maintenance is busy. Please try again.');
  try {
    const properties = PropertiesService.getScriptProperties();
    const excluded = playerModerationIds_(properties, PLAYER_EXCLUDED_ATTEMPTS_PROPERTY);
    const state = playerRead_(playerForm_(properties), properties);
    const ownerId = playerId.toLowerCase();
    if (!state.players.has(ownerId)) throw new Error('That player was not found. No exclusions were changed.');
    const before = excluded.size;
    let matched = 0;
    state.attempts.forEach(function (stored) {
      if (stored.playerId === ownerId && stored.record.startedAt <= cutoffMs) {
        matched++;
        excluded.add(stored.record.id);
      }
    });
    const serialized = JSON.stringify(Array.from(excluded).sort());
    // Script Properties has a per-value size limit. Never truncate silently.
    if (Utilities.newBlob(serialized).getBytes().length > 8500) throw new Error('The exclusion list needs a storage migration before more attempts can be excluded.');
    properties.setProperty(PLAYER_EXCLUDED_ATTEMPTS_PROPERTY, serialized);
    try { CacheService.getScriptCache().remove(PLAYER_CACHE_KEY); } catch (_) { /* Existing summaries expire within 30 seconds. */ }
    return {matched: matched, added: excluded.size - before, totalExcluded: excluded.size};
  } finally { lock.releaseLock(); }
}

function playerReportedValues_(totalSeconds, estimatedTimes) {
  function milliseconds(value) {
    if (!Number.isFinite(value) || value < 1 || value > PLAYER_MAX_SECONDS) throw new Error('Reported times must be finite seconds from 1 through 604800.');
    const scaled = value * 1000, rounded = Math.round(scaled);
    if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 0.000001) throw new Error('Reported times support at most millisecond precision.');
    return rounded;
  }
  const totalMs = milliseconds(totalSeconds);
  if (!Array.isArray(estimatedTimes) || estimatedTimes.length !== PLAYER_ROUNDS.length) throw new Error('Supply exactly one estimated time for each of the ten rounds.');
  const seen = new Set();
  let sumMs = 0;
  const estimates = estimatedTimes.map(function (entry) {
    if (!playerKeys_(entry, ['roundNumber', 'seconds']) || !PLAYER_ROUNDS.includes(entry.roundNumber) || seen.has(entry.roundNumber)) {
      throw new Error('Estimated round numbers must be unique and cover 01 through 10.');
    }
    seen.add(entry.roundNumber);
    const elapsedMs = milliseconds(entry.seconds);
    sumMs += elapsedMs;
    return {roundNumber: entry.roundNumber, seconds: elapsedMs / 1000};
  }).sort(function (a, b) { return a.roundNumber.localeCompare(b.roundNumber); });
  if (sumMs !== totalMs) throw new Error('Estimated round times must sum exactly to the reported overall time.');
  return {totalSeconds: totalMs / 1000, roundsCompleted: PLAYER_ROUNDS.length, estimatedTimes: estimates};
}

function playerReportedResults_(properties) {
  let stored;
  try { stored = JSON.parse(properties.getProperty(PLAYER_REPORTED_RESULTS_PROPERTY) || '{}'); } catch (_) { throw new Error('Invalid reported-result configuration.'); }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid reported-result configuration.');
  const result = Object.create(null);
  Object.keys(stored).forEach(function (id) {
    const entry = stored[id];
    if (!PLAYER_UUID.test(id) || result[id.toLowerCase()] ||
        !playerKeys_(entry, ['totalSeconds', 'roundsCompleted', 'estimatedTimes', 'submittedAt', 'source', 'breakdownSource']) ||
        entry.roundsCompleted !== PLAYER_ROUNDS.length || entry.source !== 'player-reported' || entry.breakdownSource !== 'estimated' ||
        typeof entry.submittedAt !== 'string') throw new Error('Invalid reported-result configuration.');
    const submitted = Date.parse(entry.submittedAt);
    if (!Number.isFinite(submitted) || submitted < 1 || submitted > Date.now() + 300000 ||
        new Date(submitted).toISOString() !== entry.submittedAt) throw new Error('Invalid reported-result date.');
    const values = playerReportedValues_(entry.totalSeconds, entry.estimatedTimes);
    result[id.toLowerCase()] = {totalSeconds: values.totalSeconds, roundsCompleted: values.roundsCompleted,
      estimatedTimes: values.estimatedTimes, submittedAt: entry.submittedAt, source: 'player-reported', breakdownSource: 'estimated'};
  });
  return result;
}

// Owner-only, explicit record of a player's reported overall result. Estimated
// splits are never written as measured attempts or admitted to round rankings.
// Passing null as totalSeconds clears this owner's configured report only.
function setReportedResult_(playerId, totalSeconds, estimatedTimes) {
  if (typeof playerId !== 'string' || !PLAYER_UUID.test(playerId)) throw new Error('Supply a valid existing player UUID.');
  const values = totalSeconds === null ? null : playerReportedValues_(totalSeconds, estimatedTimes);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Leaderboard maintenance is busy. Please try again.');
  try {
    const properties = PropertiesService.getScriptProperties();
    const reports = playerReportedResults_(properties);
    const state = playerRead_(playerForm_(properties), properties);
    const ownerId = playerId.toLowerCase();
    if (!state.players.has(ownerId)) throw new Error('That player was not found. No reported result was changed.');
    const previous = reports[ownerId];
    let changed = false;
    if (values === null) {
      changed = Boolean(previous);
      delete reports[ownerId];
    } else if (!previous || previous.totalSeconds !== values.totalSeconds ||
        JSON.stringify(previous.estimatedTimes) !== JSON.stringify(values.estimatedTimes)) {
      reports[ownerId] = {totalSeconds: values.totalSeconds, roundsCompleted: values.roundsCompleted,
        estimatedTimes: values.estimatedTimes, submittedAt: new Date().toISOString(),
        source: 'player-reported', breakdownSource: 'estimated'};
      changed = true;
    }
    if (changed) {
      const serialized = JSON.stringify(reports);
      if (Utilities.newBlob(serialized).getBytes().length > 8500) throw new Error('Reported results need a storage migration before more can be added.');
      properties.setProperty(PLAYER_REPORTED_RESULTS_PROPERTY, serialized);
    }
    try { CacheService.getScriptCache().remove(PLAYER_CACHE_KEY); } catch (_) { /* Existing summaries expire within 30 seconds. */ }
    return {ok: true, changed: changed};
  } finally { lock.releaseLock(); }
}

function playerSummary_(state, properties) {
  const hiddenIds = playerModerationIds_(properties, PLAYER_HIDDEN_PROPERTY);
  const excludedIds = playerModerationIds_(properties, PLAYER_EXCLUDED_ATTEMPTS_PROPERTY);
  const reportedResults = playerReportedResults_(properties);
  const attemptsByPlayer = new Map();
  state.attempts.forEach(function (stored) {
    if (excludedIds.has(stored.record.id)) return;
    if (!attemptsByPlayer.has(stored.playerId)) attemptsByPlayer.set(stored.playerId, []);
    attemptsByPlayer.get(stored.playerId).push(stored.record);
  });
  const players = [];
  state.players.forEach(function (player) {
    if (!player.joined || hiddenIds.has(player.id)) return;
    const played = new Set(), completed = new Set(), best = new Map();
    let count = 0, latest = null;
    (attemptsByPlayer.get(player.id) || []).forEach(function (record) {
      count++;
      latest = Math.max(latest || 0, record.finishedAt === null ? record.startedAt : record.finishedAt);
      played.add(record.roundNumber);
      if (record.status === 'completed') completed.add(record.roundNumber);
      if (record.eligible && (!best.has(record.roundNumber) || record.seconds < best.get(record.roundNumber).seconds)) {
        best.set(record.roundNumber, {roundNumber: record.roundNumber, seconds: record.seconds,
          hints: record.hints, peeks: record.peeks, geneHintsSeen: record.geneHintsSeen,
          completedAt: new Date(record.finishedAt).toISOString()});
      }
    });
    const bestTimes = Array.from(best.values()).sort(function (a, b) { return a.roundNumber.localeCompare(b.roundNumber); });
    const summary = {id: player.id, displayName: player.displayName, attempts: count, roundsPlayed: played.size,
      roundsCompleted: completed.size, timedRounds: bestTimes.length,
      totalBestSeconds: bestTimes.reduce(function (sum, result) { return sum + result.seconds; }, 0),
      latestAt: latest === null ? null : new Date(latest).toISOString(), best: bestTimes};
    const reported = reportedResults[player.id];
    if (reported) {
      summary.roundsPlayed = Math.max(summary.roundsPlayed, reported.roundsCompleted);
      summary.roundsCompleted = Math.max(summary.roundsCompleted, reported.roundsCompleted);
      summary.reportedResult = {totalSeconds: reported.totalSeconds, roundsCompleted: reported.roundsCompleted,
        estimatedTimes: reported.estimatedTimes, submittedAt: reported.submittedAt};
    }
    players.push(summary);
  });
  players.sort(function (a, b) { return b.roundsCompleted - a.roundsCompleted || b.timedRounds - a.timedRounds || a.totalBestSeconds - b.totalBestSeconds || a.id.localeCompare(b.id); });
  return {ok: true, schema: PLAYER_BOARD_SCHEMA, updatedAt: new Date().toISOString(), players: players};
}

function leaderboardGet_(event) {
  let lock, locked = false;
  try {
    if (!event || !event.parameter || event.parameter.action !== 'leaderboard' ||
        Object.keys(event.parameter).some(function (key) { return key !== 'action'; })) {
      throw publicError_('Use the public leaderboard link without player credentials.');
    }
    const cache = CacheService.getScriptCache();
    const cached = cache.get(PLAYER_CACHE_KEY);
    if (cached) return jsonOutput_(JSON.parse(cached));
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) throw publicError_('The leaderboard is updating. Please try again shortly.');
    // Another reader may have filled the cache while this request waited.
    const refreshed = cache.get(PLAYER_CACHE_KEY);
    if (refreshed) return jsonOutput_(JSON.parse(refreshed));
    const properties = PropertiesService.getScriptProperties();
    const result = playerSummary_(playerRead_(playerForm_(properties), properties), properties);
    try { cache.put(PLAYER_CACHE_KEY, JSON.stringify(result), 30); } catch (_) { /* Oversized or unavailable cache must not hide a valid board. */ }
    return jsonOutput_(result);
  } catch (error) {
    return jsonOutput_({ok: false, schema: PLAYER_BOARD_SCHEMA, error: error && error.isPublic ? error.message : 'The leaderboard could not be loaded. Please try again shortly.'});
  } finally { if (lock && locked) { try { lock.releaseLock(); } catch (_) { /* Preserve the result. */ } } }
}
