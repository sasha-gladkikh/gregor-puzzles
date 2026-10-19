import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import vm from 'node:vm';

const source = await readFile(new URL('../server/google-forms/Leaderboard.gs', import.meta.url), 'utf8');
const routes = await readFile(new URL('../server/google-forms/Code.gs', import.meta.url), 'utf8');
const suggestionId = /const SUGGESTION_FORM_ID = '([^']+)'/.exec(routes)[1];
const playerId = '82b79a65-04fa-411e-b7dc-71bb190eecb4';
const token = '7c354848-87a5-454d-a51e-e64b1b47cdb8';
const attemptId = '41bb81f5-3694-49df-b3dc-87d1135a8214';
const startedAt = 1700000000000;
const profile = (extra = {}) => ({schema: 'gregor-player-v1', action: 'profile', playerId, token, displayName: 'A. Player', revision: 1, ...extra});
const attempt = (extra = {}) => ({id: attemptId, roundNumber: '01', revision: 1, status: 'active', mode: 'timed', route: 'image', pieces: 2,
  startedAt, finishedAt: null, seconds: 10, hints: 0, peeks: 0, geneHintsSeen: 0, eligible: false, ...extra});
const complete = (extra = {}) => attempt({revision: 2, status: 'completed', pieces: 12, finishedAt: startedAt + 45000, seconds: 45, eligible: true, ...extra});
const attempts = (records, extra = {}) => ({schema: 'gregor-player-v1', action: 'attempts', playerId, token, attempts: records, ...extra});
const leave = (extra = {}) => ({schema: 'gregor-player-v1', action: 'leave', playerId, token, revision: 2, ...extra});
const event = payload => ({postData: {contents: JSON.stringify(payload), type: 'text/plain;charset=UTF-8'}});

function harness(options = {}) {
  const properties = new Map(options.noSetup ? [] : [['GREGOR_LEADERBOARD_FORM_ID', 'leaderboard-private-form'], ['GREGOR_LEADERBOARD_SIGNING_KEY', 'server-only-key']]);
  const cache = new Map(), responses = [], opened = [], created = [], cacheWrites = [];
  let releases = 0, submissions = 0, lockHeld = false;
  const item = {getTitle: () => options.wrongSchema ? 'Suggestions' : 'Leaderboard event', getType: () => 'PARAGRAPH_TEXT', isRequired: () => true,
    setTitle: () => item, setRequired: () => item, asParagraphTextItem: () => item, createResponse: value => ({value})};
  const responseFor = value => ({getItemResponses: () => [{getItem: () => item, getResponse: () => value}]});
  const config = {};
  const form = {
    getId: () => 'leaderboard-private-form', getEditUrl: () => 'https://docs.google.com/forms/d/leaderboard-private-form/edit', getItems: () => [item],
    collectsEmail: () => options.collectsEmail || false, isPublishingSummary: () => options.publicSummary || false,
    supportsAdvancedResponderPermissions: () => true, isPublished: () => options.published !== false,
    isAcceptingResponses: () => options.published !== false && options.accepting !== false,
    getResponses: () => {if (options.readFails) throw Error('secret@example.org private backend'); return responses;},
    deleteResponse: id => {assert.equal(id, 'private-response-id'); responses.pop(); return form;},
    addParagraphTextItem: () => item,
    createResponse: () => {
      let value;
      const response = {withItemResponse: answer => {value = answer.value; return response;}, submit: () => {
        submissions++;
        if (options.submitFails) throw Error('secret@example.org private backend');
        if (options.beforeSubmit) options.beforeSubmit();
        responses.push(responseFor(value));
        if (options.throwAfterSaving && submissions === 1) throw Error('Transport lost after commit');
        return {getId: () => options.unconfirmed ? null : 'private-response-id'};
      }};
      return response;
    },
  };
  for (const method of ['setCollectEmail', 'setPublishingSummary', 'setLimitOneResponsePerUser', 'setAllowResponseEdits', 'setShowLinkToRespondAgain']) {
    form[method] = value => {config[method] = value; return form;};
  }
  const context = vm.createContext({
    console: {log: () => {}},
    SUGGESTION_FORM_ID: suggestionId,
    publicError_: message => Object.assign(Error(message), {isPublic: true}),
    jsonOutput_: value => ({body: JSON.stringify(value)}),
    ContentService: {MimeType: {JSON: 'application/json'}, createTextOutput: body => ({body, setMimeType() {return this;}})},
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'}, getUuid: randomUUID,
      computeDigest: (algorithm, value, encoding) => [...createHash(algorithm).update(value, encoding).digest()],
      computeHmacSha256Signature: (value, key, encoding) => [...createHmac('sha256', key).update(value, encoding).digest()],
      newBlob: value => ({getBytes: () => [...Buffer.from(value)]}),
    },
    PropertiesService: {getScriptProperties: () => ({getProperty: key => properties.get(key) ?? null, setProperty: (key, value) => properties.set(key, value)})},
    LockService: {getScriptLock: () => {
      let acquired = false;
      return {tryLock: () => {
        if (lockHeld || options.lockAvailable === false) return false;
        acquired = true; lockHeld = true; return true;
      }, releaseLock: () => {if (acquired) {lockHeld = false; acquired = false; releases++;}}};
    }},
    CacheService: {getScriptCache: () => ({get: key => cache.get(key) ?? null,
      put: (key, value, ttl) => {cacheWrites.push({key, value, ttl}); cache.set(key, value);}, remove: key => cache.delete(key)})},
    FormApp: {ItemType: {PARAGRAPH_TEXT: 'PARAGRAPH_TEXT'},
      openById: id => {opened.push(id); assert.notEqual(id, suggestionId, 'Leaderboard must never open suggestion data'); return form;},
      create: (title, published) => {created.push({title, published}); options.published = published; return form;}},
  });
  vm.runInContext((options.routes ? routes + '\n' : '') + source, context);
  return {
    context, properties, cache, responses, opened, created, config, cacheWrites,
    publishForOwner: () => {options.published = true; options.accepting = true;},
    get submissions() {return submissions;}, get releases() {return releases;},
    post: payload => JSON.parse((options.routes ? context.doPost : context.leaderboardPost_)(event(payload)).body),
    get: (parameter = {action: 'leaderboard'}) => JSON.parse((options.routes ? context.doGet : context.leaderboardGet_)({parameter}).body),
    inject: value => responses.push(responseFor(value)),
  };
}

test('setup creates a separate form, requires manual restricted publication, and reuses its identity', () => {
  const h = harness({noSetup: true});
  assert.throws(() => h.context.setupLeaderboard(), /restrict responder access to the owner/);
  assert.equal(h.submissions, 0, 'Unpublished forms receive no doomed write probe');
  assert.equal(h.created.length, 1);
  h.publishForOwner();
  const result = h.context.setupLeaderboard();
  assert.equal(result.ok, true);
  assert.equal(h.created.length, 1);
  assert.equal(h.responses.length, 0, 'Setup removes only its own write probe');
  assert.equal(h.created[0].published, false);
  assert.deepEqual(h.config, {setCollectEmail: false, setPublishingSummary: false, setLimitOneResponsePerUser: false,
    setAllowResponseEdits: false, setShowLinkToRespondAgain: false});
  const key = h.properties.get('GREGOR_LEADERBOARD_SIGNING_KEY');
  assert.equal(key.length, 72);
  h.context.setupLeaderboard();
  assert.equal(h.created.length, 1);
  assert.equal(h.properties.get('GREGOR_LEADERBOARD_SIGNING_KEY'), key);
  assert.doesNotMatch(JSON.stringify(result), /server-only|SIGNING_KEY/);
  h.properties.delete('GREGOR_LEADERBOARD_SIGNING_KEY');
  assert.throws(() => h.context.setupLeaderboard(), /signing key is missing/);
  assert.equal(h.created.length, 1, 'Setup never replaces an existing event history after key loss');
});

test('setup detects a published form with responses closed without changing its publication settings', () => {
  const h = harness({accepting: false});
  assert.throws(() => h.context.setupLeaderboard(), /enable responses/);
  assert.equal(h.submissions, 0);
  assert.equal(h.created.length, 0);
});

test('registration, renaming and opt-out authenticate an independent browser identity', () => {
  const h = harness();
  assert.deepEqual(h.post(profile()), {ok: true, schema: 'gregor-player-v1', playerId, revision: 1});
  assert.equal(h.post(profile()).ok, true);
  assert.equal(h.submissions, 1);
  assert.equal(h.post(profile({token: randomUUID(), displayName: 'Impersonator'})).ok, false);
  assert.equal(h.post(profile({displayName: '新しい名前', revision: 2})).ok, true);
  assert.equal(h.get().players[0].displayName, '新しい名前');
  assert.equal(h.post(leave({token: randomUUID()})).ok, false);
  assert.equal(h.post(leave({revision: 3})).ok, true);
  assert.deepEqual(h.get().players, []);
  assert.equal(h.post(leave({revision: 3})).ok, true);
  assert.equal(h.submissions, 3);
  assert.equal(h.post(attempts([attempt()])).ok, false);
  assert.equal(h.post(profile({revision: 4})).ok, true);
  assert.equal(h.get().players.length, 1);
});

test('membership revisions keep delayed joins and renames from undoing an opt-out', () => {
  const h = harness();
  assert.deepEqual(h.post(leave()), {ok: true, schema: 'gregor-player-v1', playerId, revision: 2});
  assert.equal(h.submissions, 1, 'An unknown-player leave persists an authenticated tombstone');
  assert.deepEqual(h.get().players, []);
  assert.deepEqual(h.post(profile()), {ok: true, schema: 'gregor-player-v1', playerId, revision: 1});
  assert.equal(h.submissions, 1, 'A delayed join is a no-op with an exact requested-revision receipt');
  assert.deepEqual(h.get().players, []);
  assert.equal(h.post(profile({token: randomUUID()})).ok, false, 'A tombstone retains the identity key');
  assert.equal(h.post(profile({revision: 2})).ok, false, 'Conflicting equal revisions cannot change membership');
  assert.equal(h.post(profile({revision: 3})).ok, true, 'A deliberate later rejoin is supported');
  assert.equal(h.get().players.length, 1);
  assert.equal(h.post(leave({revision: 4})).ok, true);
  assert.equal(h.post(profile({revision: 3, displayName: 'Late rename'})).ok, true);
  assert.deepEqual(h.get().players, []);
  assert.equal(h.post(leave({revision: 4})).ok, true);
  assert.equal(h.submissions, 3);
  assert.equal(h.post(profile({revision: 5})).ok, true);
  assert.equal(h.post(profile({revision: 6})).ok, true, 'An identical newer intent must advance the membership revision');
  assert.equal(h.post(leave({revision: 5})).ok, true);
  assert.equal(h.get().players.length, 1);
});

test('different players can share a display name without merging their histories', () => {
  const h = harness();
  h.post(profile());
  h.post(profile({playerId: randomUUID(), token: randomUUID()}));
  assert.equal(h.get().players.length, 2);
  assert.equal(new Set(h.get().players.map(player => player.id)).size, 2);
});

test('durable attempt upserts survive cache clearing and stale updates never roll back progress', () => {
  const h = harness(); h.post(profile());
  const result = h.post(attempts([attempt()]));
  assert.deepEqual(result.accepted, [{id: attemptId, revision: 1}]);
  h.cache.clear();
  assert.deepEqual(h.post(attempts([attempt()])), result);
  assert.equal(h.submissions, 2);
  assert.equal(h.post(attempts([complete()])).ok, true);
  assert.equal(h.post(attempts([attempt()])).ok, true);
  assert.equal(h.submissions, 3);
  const player = h.get().players[0];
  assert.equal(player.attempts, 1);
  assert.equal(player.roundsPlayed, 1);
  assert.equal(player.roundsCompleted, 1);
  assert.equal(player.timedRounds, 1);
  assert.equal(player.totalBestSeconds, 45);
});

test('a cache-miss GET cannot recache old results while a new best time is being persisted', () => {
  const options = {};
  const h = harness(options);
  h.post(profile()); h.post(attempts([complete()]));
  assert.equal(h.get().players[0].totalBestSeconds, 45); // Populate the old board cache.
  let concurrentRead;
  options.beforeSubmit = () => {concurrentRead = h.get();};
  const faster = complete({id: randomUUID(), seconds: 40, finishedAt: startedAt + 40000});
  assert.equal(h.post(attempts([faster])).ok, true);
  assert.equal(concurrentRead.ok, false, 'The reader must wait for the writer or report busy, never cache old state');
  assert.match(concurrentRead.error, /updating/);
  assert.equal(h.cache.has('gregor:player-board:v1'), false);
  assert.equal(h.get().players[0].totalBestSeconds, 40);
  assert.equal(h.get().players[0].attempts, 2);
});

test('same-revision conflicts, rewinds, owner changes and terminal reversals reject atomically', () => {
  const h = harness(); h.post(profile()); h.post(attempts([attempt()]));
  for (const record of [attempt({pieces: 3}), attempt({revision: 2, pieces: 1}), attempt({revision: 2, mode: 'practice', seconds: null}),
    attempt({revision: 2, startedAt: startedAt + 1}), attempt({revision: 2, seconds: 9})]) assert.equal(h.post(attempts([record])).ok, false);
  assert.equal(h.post(attempts([complete()])).ok, true);
  for (const record of [attempt({revision: 3}), complete({revision: 3, seconds: 44, finishedAt: startedAt + 44000}), complete({revision: 3, status: 'restarted', eligible: false})]) {
    assert.equal(h.post(attempts([record])).ok, false);
  }
  const otherId = randomUUID(), otherToken = randomUUID();
  h.post(profile({playerId: otherId, token: otherToken}));
  assert.equal(h.post(attempts([complete()], {playerId: otherId, token: otherToken})).ok, false);
  const before = h.submissions;
  assert.equal(h.post(attempts([attempt({id: randomUUID()}), complete({pieces: 11})])).ok, false);
  assert.equal(h.submissions, before);
});

test('best times count unique rounds while every started attempt contributes to participation', () => {
  const h = harness(); h.post(profile());
  const records = [
    complete(), complete({id: randomUUID(), revision: 1, seconds: 42.125, finishedAt: startedAt + 42125, hints: 1, peeks: 2, geneHintsSeen: 3}),
    complete({id: randomUUID(), roundNumber: '02', seconds: 10, finishedAt: startedAt + 10000}),
    complete({id: randomUUID(), roundNumber: '03', mode: 'practice', seconds: null, eligible: false}),
    complete({id: randomUUID(), roundNumber: '04', route: 'gene', pieces: 3, eligible: false}),
    attempt({id: randomUUID(), roundNumber: '05', mode: 'practice', seconds: null}),
    attempt({id: randomUUID(), roundNumber: '01', status: 'restarted', finishedAt: startedAt + 20000, seconds: 20}),
  ];
  assert.equal(h.post(attempts(records)).ok, true);
  const player = h.get().players[0];
  assert.equal(player.attempts, 7);
  assert.equal(player.roundsPlayed, 5);
  assert.equal(player.roundsCompleted, 4);
  assert.equal(player.timedRounds, 2);
  assert.equal(player.totalBestSeconds, 52.125);
  assert.deepEqual(player.best, [{roundNumber: '01', seconds: 42.125, hints: 1, peeks: 2, geneHintsSeen: 3},
    {roundNumber: '02', seconds: 10, hints: 0, peeks: 0, geneHintsSeen: 0}]);
});

test('public summaries expose no authentication material, raw attempts, private timestamps or form identifiers', () => {
  const h = harness(); h.post(profile()); h.post(attempts([complete()]));
  const result = h.get();
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'players', 'schema', 'updatedAt']);
  assert.deepEqual(Object.keys(result.players[0]).sort(), ['attempts', 'best', 'displayName', 'id', 'roundsCompleted', 'roundsPlayed', 'timedRounds', 'totalBestSeconds']);
  const output = JSON.stringify(result);
  for (const value of [token, 'tokenHash', 'server-only-key', 'signature', 'receivedAt', 'startedAt', 'finishedAt', attemptId, 'leaderboard-private-form', suggestionId]) {
    assert.ok(!output.includes(value), value);
  }
  assert.ok(h.responses.every(response => !response.getItemResponses()[0].getResponse().includes(token)));
  assert.ok(h.opened.every(id => id === 'leaderboard-private-form'));
  const publicCache = h.cacheWrites.filter(write => write.key === 'gregor:player-board:v1');
  assert.ok(publicCache.every(write => write.ttl <= 30 && !write.value.includes('tokenHash')));
});

test('native form injections, malformed JSON and forged signatures cannot add players or attempts', () => {
  const h = harness(); h.post(profile());
  for (const value of ['{', JSON.stringify(profile({displayName: 'Forged'})), JSON.stringify({body: JSON.stringify({action: 'profile', displayName: 'Forged'}), signature: '0'.repeat(64)}), 'null']) h.inject(value);
  assert.equal(h.get().players.length, 1);
  assert.equal(h.get().players[0].displayName, 'A. Player');
  // Repeating an authentic event is harmless too.
  h.cache.clear(); h.inject(h.responses[0].getItemResponses()[0].getResponse());
  assert.equal(h.get().players.length, 1);
});

test('a lost response after persistence retries without duplicate registration or attempts', () => {
  const h = harness({throwAfterSaving: true});
  assert.equal(h.post(profile()).ok, false);
  assert.equal(h.post(profile()).ok, true);
  assert.equal(h.submissions, 1);
  assert.equal(h.get().players.length, 1);
});

test('unknown actions, fields, identities, display-name markup and credential URLs reject before form access', () => {
  const invalid = [profile({schema: 'other'}), profile({action: 'download'}), profile({unexpected: true}), profile({playerId: 'x'}), profile({token: 'x'}),
    profile({revision: 0}), profile({revision: 1.5}), profile({revision: undefined}), leave({revision: -1}), leave({revision: Number.MAX_SAFE_INTEGER + 1}),
    ...['A', ' ', '<script>x</script>', 'name@example.org', 'https://example.org', 'www.example.org', 'Name\nInjected', 'a'.repeat(33), '👋👋'].map(displayName => profile({displayName}))];
  for (const payload of invalid) {
    const h = harness(); assert.equal(h.post(payload).ok, false, JSON.stringify(payload)); assert.equal(h.opened.length, 0);
  }
  const h = harness();
  assert.equal(h.get({action: 'leaderboard', token}).ok, false);
  assert.equal(h.get({action: 'responses'}).ok, false);
  assert.equal(h.opened.length, 0);
});

test('timing, assistance, round whitelist, eligibility and batch limits are validated', () => {
  const mutations = [{roundNumber: '11'}, {revision: 0}, {revision: 1.5}, {pieces: 0}, {pieces: 13}, {hints: -1}, {peeks: 0.5}, {geneHintsSeen: 4},
    {startedAt: 0}, {startedAt: Date.now() + 600000}, {finishedAt: startedAt - 1}, {seconds: 700000}, {seconds: -1},
    {finishedAt: startedAt + 1000}, {eligible: 'true'}, {mode: 'practice'}, {route: 'gene'}, {status: 'active'}, {extra: 1}];
  for (const mutation of mutations) {
    const h = harness(); h.post(profile()); assert.equal(h.post(attempts([complete(mutation)])).ok, false, JSON.stringify(mutation));
  }
  const h = harness(); h.post(profile());
  assert.equal(h.post(attempts([])).ok, false);
  assert.equal(h.post(attempts([attempt(), attempt()])).ok, false);
  assert.equal(h.post(attempts(Array.from({length: 21}, () => attempt({id: randomUUID()})))).ok, false);
  assert.equal(h.post(attempts([complete({seconds: 0, finishedAt: startedAt, eligible: false})])).ok, true);
  assert.equal(h.post(attempts([complete({id: randomUUID(), route: 'gene', pieces: 0, seconds: 0, finishedAt: startedAt, eligible: false})])).ok, true);
  assert.equal(h.post(attempts([complete({id: randomUUID(), seconds: 700000, finishedAt: startedAt + 700000000, eligible: false})])).ok, true,
    'Long elapsed time remains in participation history without entering the time ranking');
});

test('unsupported media types, excessive body size and invalid JSON never open forms', () => {
  const h = harness();
  for (const input of [undefined, {}, {postData: {contents: '{', type: 'text/plain'}}, {postData: {contents: JSON.stringify(profile()), type: 'application/json'}},
    {postData: {contents: ' '.repeat(20001), type: 'text/plain'}}, {...event(profile()), contentLength: 20001}]) {
    assert.equal(JSON.parse(h.context.leaderboardPost_(input).body).ok, false);
  }
  assert.equal(h.opened.length, 0);
});

test('private form misconfiguration, unavailable lock and read failures fail closed without exposing details', () => {
  for (const options of [{noSetup: true}, {lockAvailable: false}, {wrongSchema: true}, {collectsEmail: true}, {publicSummary: true}, {readFails: true}]) {
    const h = harness(options);
    assert.equal(h.post(profile()).ok, false);
    assert.equal(h.submissions, 0);
    assert.doesNotMatch(JSON.stringify(h.get()), /secret@example.org|private backend|configuration changed/);
  }
  const h = harness(); h.properties.set('GREGOR_LEADERBOARD_FORM_ID', suggestionId);
  assert.equal(h.post(profile()).ok, false);
  assert.equal(h.get().ok, false);
  assert.equal(h.opened.length, 0);
});

test('capacity guard reports maintenance rather than silently truncating source data', () => {
  const h = harness();
  for (let i = 0; i < 20000; i++) h.inject('malformed');
  assert.equal(h.post(profile()).ok, false);
  const board = h.get();
  assert.equal(board.ok, false);
  assert.match(board.error, /maintenance/);
  assert.equal(h.submissions, 0);
});

test('moderation suppresses selected identities without editing private event history', () => {
  const h = harness(); h.post(profile());
  const count = h.responses.length;
  h.properties.set('GREGOR_LEADERBOARD_HIDDEN_PLAYERS', JSON.stringify([playerId]));
  assert.deepEqual(h.get().players, []);
  assert.equal(h.responses.length, count);
  h.cache.clear(); h.properties.set('GREGOR_LEADERBOARD_HIDDEN_PLAYERS', 'malformed');
  assert.equal(h.get().ok, false);
});

test('shared and per-player rate limits constrain new writes but never reject durable duplicate receipts', () => {
  for (const personal of [false, true]) {
    const h = harness(); h.post(profile());
    const key = 'gregor:board-rate:' + Math.floor(Date.now() / 60000) + (personal ? ':' + playerId : '');
    h.cache.set(key, personal ? '30' : '240');
    assert.equal(h.post(profile()).ok, true);
    assert.equal(h.post(attempts([attempt()])).ok, false);
    assert.equal(h.submissions, 1);
  }
});

test('combined deployed routes keep health checks and suggestions separate from public player summaries', () => {
  const h = harness({routes: true});
  for (const parameter of [{}, {action: 'responses'}, {action: 'download', token}]) {
    assert.deepEqual(h.get(parameter), {ok: true, service: 'gregor-suggestions', schema: 1});
  }
  assert.equal(h.opened.length, 0);
  assert.deepEqual(h.post(profile()), {ok: true, schema: 'gregor-player-v1', playerId, revision: 1});
  assert.equal(h.get().players[0].id, playerId);
  assert.equal(h.get({action: 'leaderboard', token}).ok, false);
  const before = h.opened.length;
  const suggestion = h.post({requestId: randomUUID(), website: '', gene: '', condition: '', phenotypes: ''});
  assert.equal(suggestion.ok, false);
  assert.equal(suggestion.schema, undefined);
  assert.equal(h.opened.length, before);
  assert.ok(h.opened.every(id => id === 'leaderboard-private-form'));
});
