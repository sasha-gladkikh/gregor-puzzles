import {allRounds} from './rounds.mjs';

export const SCORE_SCHEMA = 'gregor-score-v1';
export const COMMUNITY_REPOSITORY = 'https://github.com/sasha-gladkikh/gregor-puzzles';
export const SCORE_LABEL = 'leaderboard';
export const MAX_SCORE_SECONDS = 7 * 24 * 60 * 60;
export const MAX_DRAFT_URL_LENGTH = 7500;
const ISSUE_API = 'https://api.github.com/repos/sasha-gladkikh/gregor-puzzles/issues';
const SCORE_KEYS = ['schema', 'roundId', 'roundNumber', 'seconds', 'hints', 'peeks', 'geneHintsSeen'];
const roundsByNumber = new Map(allRounds.map(round => [round.number, round]));
const loginPattern = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const integerWithin = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function githubTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const normalized = value.includes('.') ? value.replace(/\.(\d{1,3})Z$/, (_, digits) => `.${digits.padEnd(3, '0')}Z`) : value.replace(/Z$/, '.000Z');
  return new Date(time).toISOString() === normalized ? time : null;
}

function scoreRecord(value, strict = false) {
  if (!plainObject(value) || value.schema !== SCORE_SCHEMA) return null;
  if (strict && (Object.keys(value).length !== SCORE_KEYS.length || Object.keys(value).some(key => !SCORE_KEYS.includes(key)))) return null;
  const round = roundsByNumber.get(value.roundNumber);
  if (!round || value.roundId !== round.id) return null;
  if (!Number.isFinite(value.seconds) || value.seconds < 1 || value.seconds > MAX_SCORE_SECONDS) return null;
  // Millisecond precision matches the game's Date.now() clock and makes ties stable.
  if (Math.abs(value.seconds * 1000 - Math.round(value.seconds * 1000)) > 0.00001) return null;
  if (!integerWithin(value.hints, 0, 100000) || !integerWithin(value.peeks, 0, 100000) || !integerWithin(value.geneHintsSeen, 0, 3) || value.geneHintsSeen > value.hints) return null;
  return Object.fromEntries(SCORE_KEYS.map(key => [key, value[key]]));
}

// Inspect the original persisted session. Restoring a legacy session can synthesize
// timestamps; those must never become a new leaderboard result.
export function eligibleScore(round, save) {
  const canonical = allRounds.find(item => item.id === round?.id && item.number === round?.number);
  const state = save?.state;
  if (!canonical || save?.timed !== true || !plainObject(state)) return null;
  if (state.leaderboardIneligible === true || state.sessionVersion !== 3 || state.timingVersion !== 2 || state.timingUnavailable !== false || state.solvedByGuess !== false || state.namedAt !== null) return null;
  if (!Array.isArray(state.placed) || state.placed.length !== 12 || new Set(state.placed).size !== 12 || !state.placed.every(piece => integerWithin(piece, 0, 11))) return null;
  if (!Array.isArray(state.usedRoutes) || !state.usedRoutes.includes('image') || state.usedRoutes.some(route => !['image', 'guess'].includes(route))) return null;
  if (!integerWithin(state.startedAt, 0, 8640000000000000) || !integerWithin(state.finishedAt, 0, 8640000000000000) || state.finishedAt <= state.startedAt) return null;
  const seconds = (state.finishedAt - state.startedAt) / 1000;
  if (!Number.isFinite(state.seconds) || Math.abs(state.seconds - seconds) > 0.001) return null;
  return scoreRecord({schema: SCORE_SCHEMA, roundId: canonical.id, roundNumber: canonical.number, seconds, hints: state.hints, peeks: state.peeks, geneHintsSeen: state.geneHintsSeen});
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const tenths = Math.round(seconds * 10);
  const hours = Math.floor(tenths / 36000);
  const minutes = Math.floor(tenths / 600) % 60;
  const remainder = `${Math.floor(tenths / 10) % 60}`.padStart(2, '0');
  return `${hours ? `${hours}:${String(minutes).padStart(2, '0')}` : minutes}:${remainder}.${tenths % 10}`;
}

function newIssueURL(title, body) {
  const url = new URL(`${COMMUNITY_REPOSITORY}/issues/new`);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  // Bound the final encoded URL too: non-ASCII input can expand substantially.
  if (url.href.length > MAX_DRAFT_URL_LENGTH) throw new RangeError('This draft is too long to open reliably. Shorten the condition or phenotype description and try again.');
  // Deliberately omit labels: players without triage rights cannot apply them.
  return url.href;
}

export function scoreIssueURL(score) {
  const valid = scoreRecord(score);
  if (!valid) throw new TypeError('This round does not have an eligible timed result.');
  return newIssueURL(`Puzzle time · Round ${valid.roundNumber} · ${formatTime(valid.seconds)}`, [
    '## Timed image puzzle',
    `Round ${valid.roundNumber} · ${formatTime(valid.seconds)}`,
    `Gene hints: ${valid.geneHintsSeen} · Total hints: ${valid.hints} · Image references: ${valid.peeks}`,
    '',
    'I completed all 12 pieces in Timed mode without gene autofill. Timing starts with the first correct placement and continues while away. Hints and image references are allowed and declared above.',
    '',
    'This is a public, self-reported score. My GitHub username will appear on the leaderboard after maintainer review. It measures puzzle completion time, not genetic knowledge. Please keep the generated result unchanged.',
    '',
    '```gregor-score-v1', JSON.stringify(valid, null, 2), '```',
  ].join('\n'));
}

function cleanField(value, name, limit, required = true) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be text.`);
  const text = value.trim().replace(/\r\n?/g, '\n');
  if (required && !text) throw new TypeError(`Add ${name.toLowerCase()}.`);
  if (text.length > limit) throw new RangeError(`${name} must be ${limit} characters or fewer.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text)) throw new TypeError(`${name} contains unsupported characters.`);
  return text;
}
const quote = value => value.split('\n').map(line => `> ${line.replace(/[\\`*_{}\[\]()<>#!|~]/g, '\\$&')}`).join('\n');
export function suggestionIssueURL({gene, condition, phenotypes = '', reference = ''} = {}) {
  const symbol = cleanField(gene, 'Gene', 60);
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/.test(symbol)) throw new TypeError('Use a gene symbol or name without links or formatting.');
  const disease = cleanField(condition, 'Condition', 160);
  const features = cleanField(phenotypes, 'Phenotypes', 600, false);
  const source = cleanField(reference, 'Reference', 300, false);
  if (source) {
    let parsed;
    try { parsed = new URL(source); } catch { throw new TypeError('Reference must be a complete http or https URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new TypeError('Reference must be a public http or https URL without credentials.');
  }
  return newIssueURL(`Puzzle suggestion · ${symbol.replace(/\s+/g, ' ')} · ${disease.replace(/\s+/g, ' ')}`, [
    '## Suggested gene–condition association',
    `**Gene**\n${quote(symbol)}`, `**Condition**\n${quote(disease)}`,
    `**Phenotypes or teaching points**\n${quote(features || 'Not provided')}`,
    `**Public reference**\n${quote(source || 'Not provided')}`,
    '', 'This is a suggestion for educational content, not a patient case or a claim that this association has been verified. Please include public scientific information only. Do not submit patient details, personal genetic results, contact details, or unpublished family data.',
  ].join('\n\n'));
}

export function parseIssueScore(issue) {
  if (!plainObject(issue) || Object.hasOwn(issue, 'pull_request') || !Array.isArray(issue.labels) || !issue.labels.some(label => (typeof label === 'string' ? label : label?.name) === SCORE_LABEL)) return null;
  if (!integerWithin(issue.number, 1, Number.MAX_SAFE_INTEGER) || issue.html_url !== `${COMMUNITY_REPOSITORY}/issues/${issue.number}`) return null;
  if (!loginPattern.test(issue.user?.login ?? '') || issue.user?.type !== 'User') return null;
  const createdAt = githubTimestamp(issue.created_at), updatedAt = githubTimestamp(issue.updated_at);
  if (createdAt === null || updatedAt === null || updatedAt < createdAt) return null;
  if (typeof issue.body !== 'string' || issue.body.length > 20000) return null;
  const blocks = [...issue.body.matchAll(/^```gregor-score-v1\s*\r?\n([^]*?)^```\s*$/gm)];
  if (blocks.length !== 1) return null;
  let data;
  try { data = JSON.parse(blocks[0][1]); } catch { return null; }
  const score = scoreRecord(data, true);
  if (!score) return null;
  return {...score, login: issue.user.login, issueNumber: issue.number, url: issue.html_url, submittedAt: issue.created_at};
}

export function rankScores(scores, roundNumber) {
  const number = String(roundNumber).padStart(2, '0');
  if (!roundsByNumber.has(number)) return [];
  const best = new Map();
  const order = (a, b) => a.seconds - b.seconds || a.submittedAt.localeCompare(b.submittedAt) || a.issueNumber - b.issueNumber || a.login.localeCompare(b.login);
  for (const score of Array.isArray(scores) ? scores : []) {
    if (!scoreRecord(score) || score.roundNumber !== number || !loginPattern.test(score.login ?? '') || githubTimestamp(score.submittedAt) === null || !integerWithin(score.issueNumber, 1, Number.MAX_SAFE_INTEGER) || score.url !== `${COMMUNITY_REPOSITORY}/issues/${score.issueNumber}`) continue;
    const key = score.login.toLowerCase();
    if (!best.has(key) || order(score, best.get(key)) < 0) best.set(key, score);
  }
  let rank = 0, previousTime;
  return [...best.values()].sort(order).map((score, index) => {
    if (score.seconds !== previousTime) rank = index + 1;
    previousTime = score.seconds;
    return {...score, rank};
  });
}

const hasNextPage = (response, count) => {
  const link = response.headers?.get?.('link');
  return link ? /;\s*rel="next"/.test(link) : count === 100;
};
async function githubPage(url, fetchImpl, signal) {
  const response = await fetchImpl(url.href, {signal, redirect: 'error', headers: {Accept: 'application/vnd.github+json'}});
  if (!response.ok) throw new Error(`Leaderboard could not be refreshed (GitHub ${response.status}).`);
  const items = await response.json();
  if (!Array.isArray(items) || items.length > 100) throw new Error('GitHub returned an unexpected leaderboard response.');
  return {items, next: hasNextPage(response, items.length)};
}

async function approvalIsCurrent(issue, fetchImpl, signal) {
  let latest = null;
  for (let page = 1; page <= 10; page++) {
    // Never follow issue-provided events_url or pagination destinations.
    const url = new URL(`${ISSUE_API}/${issue.number}/events`);
    url.search = new URLSearchParams({per_page: '100', page: String(page)}).toString();
    const {items, next} = await githubPage(url, fetchImpl, signal);
    for (const event of items) {
      if (!['labeled', 'unlabeled'].includes(event?.event) || event.label?.name !== SCORE_LABEL) continue;
      const time = githubTimestamp(event.created_at);
      if (time === null || !integerWithin(event.id, 1, Number.MAX_SAFE_INTEGER)) throw new Error('GitHub returned invalid leaderboard approval evidence.');
      // Event IDs settle label/unlabel operations within the same timestamp.
      if (!latest || time > latest.time || (time === latest.time && event.id > latest.id)) latest = {time, id: event.id, event: event.event};
    }
    if (!next) return latest?.event === 'labeled' && githubTimestamp(issue.updated_at) <= latest.time;
    if (page === 10) throw new Error(`Issue #${issue.number} exceeds the 1,000-event approval limit; no partial leaderboard was published.`);
  }
  return false;
}

// Called at deployment time. A labelled issue must also be unchanged since its
// latest approval, independent of whether an edit-triggered job has run yet.
export async function loadLeaderboard({fetchImpl = fetch, signal} = {}) {
  const candidates = new Map();
  for (let page = 1; page <= 10; page++) {
    const url = new URL(ISSUE_API);
    url.search = new URLSearchParams({labels: SCORE_LABEL, state: 'all', sort: 'created', direction: 'asc', per_page: '100', page: String(page)}).toString();
    const {items, next} = await githubPage(url, fetchImpl, signal);
    for (const issue of items) {
      const score = parseIssueScore(issue);
      if (score) candidates.set(score.issueNumber, {score, issue});
    }
    if (!next) break;
    if (page === 10) throw new Error('Leaderboard exceeds the 1,000-issue refresh limit. Archive older results before refreshing; no partial leaderboard was published.');
  }
  const list = [...candidates.values()], approved = new Array(list.length).fill(false);
  let nextIndex = 0;
  // Bound API concurrency rather than flooding GitHub for a large collection.
  await Promise.all(Array.from({length: Math.min(4, list.length)}, async () => {
    while (nextIndex < list.length) {
      const index = nextIndex++;
      approved[index] = await approvalIsCurrent(list[index].issue, fetchImpl, signal);
    }
  }));
  // Only normalized score fields are published, never raw issue/event content.
  return list.filter((_, index) => approved[index]).map(item => item.score);
}
