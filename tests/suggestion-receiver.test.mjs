import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import vm from 'node:vm';

const source = await readFile(new URL('../server/google-forms/Code.gs', import.meta.url), 'utf8');
const requestId = '8e5cf9b2-0b0a-4ea8-94b0-12bd71664df7';
const valid = (extra = {}) => ({requestId, gene: 'FAM177A1', condition: 'Example condition', phenotypes: 'Developmental delay\nHypotonia', reference: 'https://example.org/paper', name: 'A. Reviewer', email: 'reviewer@example.org', website: '', ...extra});
const event = (payload, extra = {}) => ({postData: {contents: JSON.stringify(payload), type: 'text/plain;charset=UTF-8'}, ...extra});
function harness(options = {}) {
  const cache = new Map();
  const cacheWrites = [];
  const submitted = [];
  let opens = 0, releases = 0, attempts = 0;
  const definitions = [
    ['Gene', 'TEXT', true], ['Condition', 'TEXT', true], ['Phenotypes', 'PARAGRAPH_TEXT', true],
    ['Reference (optional)', 'TEXT', false], ['Name (optional)', 'TEXT', false], ['Email (optional)', 'TEXT', false],
  ];
  if (options.mutateSchema) options.mutateSchema(definitions);
  const items = definitions.map(([title, type, required]) => {
    const typed = {isRequired: () => required, createResponse: value => ({title, value})};
    return {getTitle: () => title, getType: () => type, asTextItem: () => typed, asParagraphTextItem: () => typed};
  });
  const context = vm.createContext({
    ContentService: {
      MimeType: {JSON: 'application/json'},
      createTextOutput: body => ({body, setMimeType(mime) {this.mime = mime; return this;}}),
    },
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'}, getUuid: () => randomUUID(),
      computeDigest: (algorithm, body, encoding) => [...createHash(algorithm).update(body, encoding).digest()].map(byte => byte > 127 ? byte - 256 : byte),
      newBlob: body => ({getBytes: () => [...Buffer.from(body)]}),
    },
    LockService: {getScriptLock: () => ({tryLock: () => options.lockAvailable !== false, releaseLock: () => {releases++;}})},
    CacheService: {getScriptCache: () => ({
      get: key => {if (options.cacheUnavailable) throw new Error('Private backend exception'); return cache.get(key) ?? null;},
      put: (key, value, seconds) => {
        if (options.failSavedCache && value.includes('"status":"saved"')) throw new Error('Cache unavailable');
        cacheWrites.push({key, value, seconds}); cache.set(key, value);
      },
    })},
    FormApp: {
      ItemType: {TEXT: 'TEXT', PARAGRAPH_TEXT: 'PARAGRAPH_TEXT'},
      openById: id => {
        opens++;
        assert.equal(id, '1TMStxvKo1rtEiBkiXxw7uLIV0B1397544jpKsRloqjk');
        if (options.openFails) throw new Error('Private backend exception with secret@example.org');
        return {
          isAcceptingResponses: () => options.accepting !== false,
          getItems: () => items,
          createResponse: () => {
            const answers = [];
            const response = {
              withItemResponse(answer) {answers.push(answer); return response;},
              submit() {
                attempts++;
                if (options.submitFails) throw new Error('Private backend exception with secret@example.org');
                submitted.push(answers);
                return {getId: () => options.unconfirmed ? null : 'private-google-response-id'};
              },
            };
            return response;
          },
        };
      },
    },
  });
  vm.runInContext(source, context);
  return {
    context, cache, cacheWrites, submitted,
    get opens() {return opens;}, get releases() {return releases;}, get attempts() {return attempts;},
    post(payload = valid(), overrides) {const result = context.doPost(event(payload, overrides)); assert.equal(result.mime, 'application/json'); return JSON.parse(result.body);},
  };
}

test('receiver saves the six named form answers and returns only an opaque receipt after confirmation', () => {
  const h = harness();
  const result = h.post();
  assert.equal(result.ok, true);
  assert.match(result.receipt, /^[a-f0-9-]{36}$/);
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'receipt']);
  assert.deepEqual(h.submitted[0], [
    {title: 'Gene', value: 'FAM177A1'}, {title: 'Condition', value: 'Example condition'},
    {title: 'Phenotypes', value: 'Developmental delay\nHypotonia'},
    {title: 'Reference (optional)', value: 'https://example.org/paper'},
    {title: 'Name (optional)', value: 'A. Reviewer'}, {title: 'Email (optional)', value: 'reviewer@example.org'},
  ]);
  assert.equal(h.releases, 1);
  assert.ok(h.cacheWrites.every(entry => entry.seconds <= 21600));
  const exposed = JSON.stringify([result, h.cacheWrites]);
  for (const secret of ['private-google-response-id', 'reviewer@example.org', 'A. Reviewer', 'FAM177A1']) assert.ok(!exposed.includes(secret));
});

test('optional contact fields can be omitted and multiline phenotypes normalize CRLF', () => {
  const h = harness();
  const input = valid({gene: '  FAM177A1  ', phenotypes: 'Delay\r\nHypotonia'});
  for (const field of ['reference', 'name', 'email']) delete input[field];
  assert.equal(h.post(input).ok, true);
  assert.deepEqual(h.submitted[0], [{title: 'Gene', value: 'FAM177A1'}, {title: 'Condition', value: 'Example condition'}, {title: 'Phenotypes', value: 'Delay\nHypotonia'}]);
});

test('identical retries share one receipt and cannot create a second response', () => {
  const h = harness();
  const first = h.post();
  assert.deepEqual(h.post(), first);
  assert.equal(h.attempts, 1);
  assert.equal(h.opens, 1);
  assert.equal(h.releases, 2);
  const changed = h.post(valid({gene: 'SBDS'}));
  assert.equal(changed.ok, false);
  assert.match(changed.error, /changed/);
  assert.equal(h.attempts, 1);
});

test('a new request UUID permits a separate suggestion and normalized equivalent retries deduplicate', () => {
  const h = harness();
  const first = h.post(valid({phenotypes: 'Delay\r\nHypotonia'}));
  assert.deepEqual(h.post(valid({phenotypes: 'Delay\nHypotonia'})), first);
  assert.equal(h.post(valid({requestId: randomUUID()})).ok, true);
  assert.equal(h.attempts, 2);
});

test('required fields, bounds, controls, unknown keys and non-string values are rejected before opening Forms', () => {
  const mutations = [
    {gene: ''}, {gene: ' '.repeat(10)}, {condition: ''}, {phenotypes: ''},
    {gene: 'a'.repeat(61)}, {condition: 'a'.repeat(161)}, {phenotypes: 'a'.repeat(2001)},
    {reference: 'a'.repeat(501)}, {name: 'a'.repeat(101)}, {email: 'a'.repeat(255)},
    {gene: 'CLCN1\n'}, {condition: 'Condition\t'}, {name: 'Name\r'}, {email: 'a\n@example.org'},
    {reference: 'https://example.org/\u0000'}, {phenotypes: 'Delay\u0000'}, {phenotypes: 'Delay\rHypotonia'},
    {phenotypes: 'Delay\u0085'}, {gene: 1}, {condition: null}, {phenotypes: []}, {email: {}},
    {website: 'spam'}, {website: undefined}, {requestId: 'anything'}, {requestId: '../path'}, {unexpected: 'value'},
  ];
  for (const mutation of mutations) {
    const h = harness();
    assert.equal(h.post(valid(mutation)).ok, false, JSON.stringify(mutation));
    assert.equal(h.opens, 0);
  }
});

test('malformed or oversized requests and unsupported media types are rejected', () => {
  const events = [
    undefined, {}, {postData: {contents: '{', type: 'text/plain'}},
    event([]), event(null), event('string'),
    event(valid(), {contentLength: 16001}),
    {postData: {contents: ' '.repeat(16001), type: 'text/plain'}},
    {postData: {contents: JSON.stringify(valid()), type: 'application/json'}},
    {postData: {contents: JSON.stringify(valid()), type: 'text/plain-spoof'}},
    {postData: {contents: '{"__proto__":{},' + JSON.stringify(valid()).slice(1), type: 'text/plain'}},
  ];
  for (const input of events) {
    const h = harness();
    assert.equal(JSON.parse(h.context.doPost(input).body).ok, false);
    assert.equal(h.opens, 0);
  }
});

test('reference URLs require a valid http(s) hostname and cannot carry credentials', () => {
  for (const reference of ['javascript:alert(1)', '//example.org/a', 'https://', 'https://user:password@example.org', 'https://user@example.org', 'https://ex ample.org', 'https://example.org\\@evil.example', 'https://example.org:99999', 'https://-bad.example', 'https://example.org:abc', 'https://example.org:']) {
    assert.equal(harness().post(valid({reference})).ok, false, reference);
  }
  for (const reference of ['https://example.org/paper?gene=FAM177A1#abstract', 'http://example.org:8080/a', 'https://pubmed.ncbi.nlm.nih.gov/12345678/', '']) assert.equal(harness().post(valid({reference})).ok, true, reference);
});

test('email validation accepts normal optional addresses and rejects invalid or header-injection values', () => {
  for (const email of ['a@example.org', 'a+b@example.org', "o'connor@example.org", '']) assert.equal(harness().post(valid({email})).ok, true, email);
  for (const email of ['no-address', '@example.org', 'a@localhost', 'a@@example.org', 'a b@example.org', '.a@example.org', 'a..b@example.org', 'a@-example.org', 'a@example.org\r\nBcc:private@example.org']) assert.equal(harness().post(valid({email})).ok, false, email);
});

test('closed forms, missing/duplicate/wrong-type items and incorrect required settings fail without submission', () => {
  const options = [
    {accepting: false}, {openFails: true},
    {mutateSchema: items => items.pop()},
    {mutateSchema: items => items[1][0] = 'Gene'},
    {mutateSchema: items => items[2][1] = 'TEXT'},
    {mutateSchema: items => items[0][2] = false},
    {mutateSchema: items => items[5][2] = true},
    {mutateSchema: items => items[4][0] = 'Name'},
  ];
  for (const option of options) {
    const h = harness(option); const result = h.post();
    assert.equal(result.ok, false); assert.equal(h.attempts, 0); assert.equal(h.releases, 1);
    assert.doesNotMatch(JSON.stringify(result), /secret@example.org|Private backend exception|Form schema/);
  }
});

test('an unconfirmed or throwing submit never returns success and immediate retries do not submit twice', () => {
  for (const options of [{submitFails: true}, {unconfirmed: true}]) {
    const h = harness(options);
    assert.equal(h.post().ok, false);
    const retry = h.post();
    assert.equal(retry.ok, false); assert.match(retry.error, /earlier attempt/);
    assert.match(retry.error, /retries of this suggestion are paused for up to six hours/);
    assert.equal(h.attempts, 1); assert.equal(h.releases, 2);
    assert.doesNotMatch(JSON.stringify(retry), /secret@example.org|Private backend exception/);
  }
});

test('cache failure after confirmed save preserves success; an unavailable lock or cache prevents writes', () => {
  const saved = harness({failSavedCache: true});
  assert.equal(saved.post().ok, true); assert.equal(saved.submitted.length, 1);
  for (const options of [{lockAvailable: false}, {cacheUnavailable: true}]) {
    const h = harness(options); assert.equal(h.post().ok, false); assert.equal(h.opens, 0); assert.equal(h.attempts, 0);
    assert.equal(h.releases, options.lockAvailable === false ? 0 : 1);
  }
});

test('the shared circuit breaker accepts ordinary conference traffic and blocks excessive writes', () => {
  const h = harness();
  const minute = Math.floor(Date.now() / 60000);
  h.cache.set('suggestion:minute:' + minute, '119');
  assert.equal(h.post().ok, true);
  assert.equal(h.post(valid({requestId: randomUUID()})).ok, false);
  assert.equal(h.attempts, 1);
  // A legitimate retry remains successful even while new submissions are limited.
  assert.equal(h.post().ok, true);
});

test('GET cannot read, enumerate, edit or reveal submitted responses regardless of query parameters', () => {
  const h = harness(); h.post();
  const opens = h.opens;
  const output = h.context.doGet({parameter: {action: 'responses', email: 'reviewer@example.org', requestId}});
  assert.equal(output.mime, 'application/json');
  assert.deepEqual(JSON.parse(output.body), {ok: true, service: 'gregor-suggestions', schema: 1});
  assert.equal(h.opens, opens);
  assert.doesNotMatch(source, /getResponses\s*\(|getEditResponseUrl\s*\(|Logger\.|console\./);
});
