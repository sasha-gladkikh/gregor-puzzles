import test from 'node:test';
import assert from 'node:assert/strict';
import {allRounds} from '../game/rounds.mjs';
import {newState, place} from '../game/engine.mjs';
import {startRound, finishRound} from '../game/session.mjs';
import {eligibleScore, formatTime, scoreIssueURL, parseIssueScore, rankScores, loadLeaderboard, COMMUNITY_REPOSITORY} from '../game/community.mjs';

function session(seconds = 45.125) {
  const state = newState();
  startRound(state, true, 'image', 1000000);
  for (let piece = 0; piece < 12; piece++) place(state, piece, piece);
  finishRound(state, 1000000 + seconds * 1000);
  return {timed: true, state};
}
const score = (round = allRounds[0], seconds = 45.125) => eligibleScore(round, session(seconds));
function issue({record = score(), login = 'learner', number = 1, ...extra} = {}) {
  return {number, html_url: `${COMMUNITY_REPOSITORY}/issues/${number}`, labels: [{name: 'leaderboard'}], user: {login, type: 'User'}, created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-19T12:00:00Z', body: new URL(scoreIssueURL(record)).searchParams.get('body'), ...extra};
}
const approvalEvent = (extra = {}) => ({id: 1, event: 'labeled', label: {name: 'leaderboard'}, created_at: '2026-10-19T12:00:01Z', ...extra});
const response = (data, link = null) => ({ok: true, status: 200, headers: {get: () => link}, json: async () => data});

test('only real completed timed image sessions produce scores, with declared assistance', () => {
  for (const round of allRounds) {
    const saved = session();
    saved.state.hints = 2; saved.state.geneHintsSeen = 2; saved.state.peeks = 4; saved.state.usedRoutes.push('guess');
    const result = eligibleScore(round, saved);
    assert.equal(result.roundId, round.id);
    assert.equal(result.roundNumber, round.number);
    assert.equal(result.seconds, 45.125);
    assert.deepEqual([result.hints, result.peeks, result.geneHintsSeen], [2, 4, 2]);
  }
  const invalid = [
    saved => saved.timed = false,
    saved => saved.state.solvedByGuess = true,
    saved => saved.state.namedAt = 3,
    saved => saved.state.timingUnavailable = true,
    saved => saved.state.leaderboardIneligible = true,
    saved => saved.state.sessionVersion = 2,
    saved => saved.state.timingVersion = 1,
    saved => saved.state.placed.pop(),
    saved => saved.state.placed[11] = 0,
    saved => saved.state.placed[11] = 12,
    saved => saved.state.startedAt = null,
    saved => saved.state.finishedAt = null,
    saved => saved.state.finishedAt = saved.state.startedAt - 1,
    saved => saved.state.seconds = 1,
    saved => saved.state.seconds = Infinity,
    saved => saved.state.usedRoutes.push('legacy'),
    saved => saved.state.usedRoutes = [],
    saved => saved.state.peeks = -1,
    saved => saved.state.hints = 0.5,
    saved => saved.state.geneHintsSeen = 4,
    saved => saved.state.geneHintsSeen = 1,
  ];
  for (const mutate of invalid) {
    const saved = session(); mutate(saved);
    assert.equal(eligibleScore(allRounds[0], saved), null, mutate.toString());
  }
  assert.equal(eligibleScore(allRounds[0], null), null);
  assert.equal(eligibleScore({...allRounds[0], id: 'unknown'}, session()), null);
  assert.equal(eligibleScore(allRounds[0], session(0)), null);
  assert.equal(eligibleScore(allRounds[0], session(604801)), null);
});

test('score drafts round-trip without labels, arbitrary identity or automatic publication', () => {
  const url = new URL(scoreIssueURL(score()));
  assert.equal(url.origin + url.pathname, `${COMMUNITY_REPOSITORY}/issues/new`);
  assert.deepEqual([...url.searchParams.keys()], ['title', 'body']);
  assert.match(url.searchParams.get('body'), /self-reported/);
  assert.match(url.searchParams.get('body'), /first correct placement/);
  assert.equal(parseIssueScore(issue()).seconds, 45.125);
  assert.equal(parseIssueScore(issue()).login, 'learner');
  assert.throws(() => scoreIssueURL({...score(), roundId: 'wrong'}));
  assert.throws(() => scoreIssueURL({...score(), seconds: NaN}));
});

test('public score parser rejects unapproved, ambiguous, forged-schema and off-repository data', () => {
  const valid = issue();
  const invalid = [
    {...valid, labels: []}, {...valid, pull_request: {}},
    {...valid, html_url: 'https://example.com/score'},
    {...valid, html_url: `${valid.html_url}?spoofed=1`},
    {...valid, user: {login: '<script>', type: 'User'}},
    {...valid, user: {login: 'test-bot', type: 'Bot'}},
    {...valid, created_at: 'not-a-date'},
    {...valid, updated_at: undefined},
    {...valid, updated_at: '2026-02-31T12:00:00Z'},
    {...valid, updated_at: 'yesterday'},
    {...valid, updated_at: '2026-10-18T12:00:00Z'},
    {...valid, body: valid.body + '\n' + valid.body},
    {...valid, body: valid.body.replace('gregor-score-v1', 'gregor-score-v2')},
    {...valid, body: '```gregor-score-v1\n{"roundNumber":"01"}\n```'},
    {...valid, body: valid.body.replace('"seconds": 45.125', '"seconds": "1"')},
    {...valid, body: valid.body.replace('"roundId": "clcn1-recessive-v1"', '"roundId": "another-round"')},
    {...valid, body: valid.body.replace('"geneHintsSeen": 0', '"geneHintsSeen": 0, "login": "someone-else"')},
    {...valid, body: valid.body.replace('"geneHintsSeen": 0', '"geneHintsSeen": -1')},
  ];
  for (const value of invalid) assert.equal(parseIssueScore(value), null, JSON.stringify(value));
  assert.ok(parseIssueScore({...valid, state: 'closed'}), 'approved closed issues remain listed');
  assert.equal(parseIssueScore({...valid, body: valid.body.replaceAll('\n', '\r\n')}).seconds, 45.125);
});

test('ranking is round-specific, best-per-account, case-insensitive, with honest ties', () => {
  const inputs = [
    issue({login: 'Alice', number: 1, record: score(allRounds[0], 42)}),
    issue({login: 'alice', number: 2, record: score(allRounds[0], 40)}),
    issue({login: 'Bob', number: 3, record: score(allRounds[0], 40)}),
    issue({login: 'Cara', number: 4, record: score(allRounds[0], 41)}),
    issue({login: 'Dani', number: 5, record: score(allRounds[1], 2)}),
  ].map(parseIssueScore);
  assert.deepEqual(rankScores(inputs, '01').map(item => [item.login, item.rank, item.seconds]), [['alice', 1, 40], ['Bob', 1, 40], ['Cara', 3, 41]]);
  assert.deepEqual(rankScores(inputs, 2).map(item => item.login), ['Dani']);
  assert.deepEqual(rankScores(inputs, '99'), []);
  assert.deepEqual(rankScores([{...inputs[0], url: 'javascript:alert(1)'}], 1), []);
});

test('time formatting carries rounded seconds and stays meaningful above an hour', () => {
  assert.equal(formatTime(45.125), '0:45.1');
  assert.equal(formatTime(59.99), '1:00.0');
  assert.equal(formatTime(3601.2), '1:00:01.2');
  assert.equal(formatTime(NaN), '—');
  assert.equal(formatTime(-2), '—');
});

test('leaderboard loader uses all states and pages without following arbitrary URLs', async () => {
  const requests = [];
  const controller = new AbortController();
  const fetchImpl = async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (new URL(url).pathname.endsWith('/events')) return response([approvalEvent()]);
    requests.push(url);
    assert.equal(options.signal, controller.signal);
    assert.equal(new URL(url).searchParams.get('state'), 'all');
    assert.equal(new URL(url).searchParams.get('labels'), 'leaderboard');
    assert.equal(new URL(url).origin, 'https://api.github.com');
    return requests.length === 1 ? response([issue()], '<https://evil.example/>; rel="next"') : response([issue({number: 2}), issue({number: 3, labels: []})], '<https://api.github.com/>; rel="prev"');
  };
  const result = await loadLeaderboard({fetchImpl, signal: controller.signal});
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[1]).searchParams.get('page'), '2');
  assert.deepEqual(result.map(item => item.issueNumber), [1, 2]);
});

test('leaderboard loader reports API errors, malformed responses and pagination overflow without partial success', async () => {
  await assert.rejects(loadLeaderboard({fetchImpl: async () => ({ok: false, status: 403})}), /GitHub 403/);
  await assert.rejects(loadLeaderboard({fetchImpl: async () => response({message: 'error'})}), /unexpected/);
  await assert.rejects(loadLeaderboard({fetchImpl: async () => { throw new Error('network offline'); }}), /offline/);
  let count = 0;
  await assert.rejects(loadLeaderboard({fetchImpl: async () => { count++; return response([issue()], '<https://api.github.com/>; rel="next"'); }}), /1,000-issue/);
  assert.equal(count, 10);
  assert.deepEqual(await loadLeaderboard({fetchImpl: async () => response([])}), []);
});


test('legacy provenance remains disqualifying after a normalized session is saved again', () => {
  const saved = session();
  saved.state.leaderboardIneligible = true;
  const persistedAgain = JSON.parse(JSON.stringify(saved));
  assert.equal(eligibleScore(allRounds[0], persistedAgain), null);
  assert.ok(eligibleScore(allRounds[0], session()), 'a new timed attempt is eligible');
});

const {revokeScoreApproval} = await import('../scripts/revoke-score-approval.mjs');
const approvalOptions = {issueNumber: '42', repository: 'sasha-gladkikh/gregor-puzzles', token: 'test-token'};
test('editing an approved score removes only its approval label at the fixed repository', async () => {
  const calls = [];
  const result = await revokeScoreApproval({...approvalOptions, fetchImpl: async (url, options) => {
    calls.push({url, options});
    assert.equal(options.method, 'DELETE');
    assert.equal(options.redirect, 'error');
    return {status: 200, json: async () => [{name: 'other-label'}]};
  }});
  assert.deepEqual(result, {removed: true, issueNumber: 42});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/sasha-gladkikh/gregor-puzzles/issues/42/labels/leaderboard');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('approval revocation rejects unsafe inputs before any request and fails closed on API errors', async () => {
  const neverFetch = async () => { throw new Error('must not fetch'); };
  for (const changes of [{issueNumber: '42/labels'}, {issueNumber: '01'}, {issueNumber: '9007199254740992'}, {repository: 'someone/another-repo'}, {token: ''}]) {
    await assert.rejects(revokeScoreApproval({...approvalOptions, ...changes, fetchImpl: neverFetch}), error => !error.message.includes('must not fetch'));
  }
  await assert.rejects(revokeScoreApproval({...approvalOptions, fetchImpl: async () => ({status: 403})}), /must not refresh/);
  await assert.rejects(revokeScoreApproval({...approvalOptions, fetchImpl: async () => ({status: 200, json: async () => [{name: 'leaderboard'}]})}), /did not confirm/);
  await assert.rejects(revokeScoreApproval({...approvalOptions, fetchImpl: async () => ({status: 404})}), /must not refresh/);
});

test('repeated approval events only succeed after confirming the label is already absent', async () => {
  const replies = [{status: 404}, {status: 200, json: async () => ({number: 42, html_url: `${COMMUNITY_REPOSITORY}/issues/42`, labels: [{name: 'other-label'}]})}];
  const calls = [];
  const result = await revokeScoreApproval({...approvalOptions, fetchImpl: async (url, options) => {calls.push({url, options});return replies.shift();}});
  assert.deepEqual(result, {removed: false, issueNumber: 42});
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.github.com/repos/sasha-gladkikh/gregor-puzzles/issues/42');
  const stillApproved = [{status: 404}, {status: 200, json: async () => ({number: 42, html_url: `${COMMUNITY_REPOSITORY}/issues/42`, labels: [{name: 'leaderboard'}]})}];
  await assert.rejects(revokeScoreApproval({...approvalOptions, fetchImpl: async () => stillApproved.shift()}), /must not refresh/);
});

test('snapshot requires an approval event at or after the issue update, independent of edit jobs', async () => {
  const cases = [
    {updated: '2026-10-19T12:00:00Z', events: [approvalEvent()], accepted: true},
    {updated: '2026-10-19T12:00:01Z', events: [approvalEvent()], accepted: true},
    {updated: '2026-10-19T12:00:02Z', events: [approvalEvent()], accepted: false},
    {updated: '2026-10-19T12:00:00Z', events: [], accepted: false},
    {updated: '2026-10-19T12:00:02Z', events: [approvalEvent(), approvalEvent({id: 2, event: 'unlabeled', created_at: '2026-10-19T12:00:02Z'})], accepted: false},
    {updated: '2026-10-19T12:00:02Z', events: [approvalEvent(), approvalEvent({id: 2, event: 'unlabeled', created_at: '2026-10-19T12:00:02Z'}), approvalEvent({id: 3, created_at: '2026-10-19T12:00:03Z'})], accepted: true},
  ];
  for (const {updated, events, accepted} of cases) {
    const result = await loadLeaderboard({fetchImpl: async (url, options) => {
      assert.equal(new URL(url).origin, 'https://api.github.com');
      assert.equal(options.redirect, 'error');
      if (new URL(url).pathname.endsWith('/events')) {
        assert.equal(new URL(url).pathname, '/repos/sasha-gladkikh/gregor-puzzles/issues/1/events');
        return response(events);
      }
      return response([issue({updated_at: updated, events_url: 'https://untrusted.example/events'})]);
    }});
    assert.equal(result.length, accepted ? 1 : 0);
    if (accepted) assert.deepEqual(Object.keys(result[0]).sort(), ['schema','roundId','roundNumber','seconds','hints','peeks','geneHintsSeen','login','issueNumber','url','submittedAt'].sort(), 'raw approval events are not published');
  }
});

test('approval freshness checks every event page and uses event IDs to settle same-second label changes', async () => {
  const eventRequests = [];
  const result = await loadLeaderboard({fetchImpl: async url => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith('/events')) return response([issue()]);
    eventRequests.push(url);
    return parsed.searchParams.get('page') === '1'
      ? response([approvalEvent()], '<https://untrusted.example/next>; rel="next"')
      : response([approvalEvent({id: 2, event: 'unlabeled'})], '<https://api.github.com/prev>; rel="prev"');
  }});
  assert.deepEqual(result, []);
  assert.equal(eventRequests.length, 2);
  assert.equal(new URL(eventRequests[1]).origin, 'https://api.github.com');
  assert.equal(new URL(eventRequests[1]).searchParams.get('page'), '2');
});

test('an unavailable or invalid approval history fails the entire refresh', async () => {
  for (const eventResponse of [
    {ok: false, status: 403},
    response({message: 'unexpected'}),
    response([approvalEvent({created_at: '2026-02-31T12:00:01Z'})]),
    response([approvalEvent({id: '1'})]),
  ]) await assert.rejects(loadLeaderboard({fetchImpl: async url => new URL(url).pathname.endsWith('/events') ? eventResponse : response([issue()])}));
  let eventPages = 0;
  await assert.rejects(loadLeaderboard({fetchImpl: async url => {
    if (!new URL(url).pathname.endsWith('/events')) return response([issue()]);
    eventPages++; return response([approvalEvent()], '<https://api.github.com/next>; rel="next"');
  }}), /1,000-event/);
  assert.equal(eventPages, 10);
});
