/**
 * GREGoR Puzzles: anonymous, write-only suggestion receiver.
 * Deploy as a web app, execute as the owner, accessible to anyone.
 * Only the Forms OAuth scope is needed. Never add a response-reading endpoint.
 * Client requests use text/plain JSON (no custom headers or credentials).
 * Cache-based retry protection is best effort, expires within six hours, and
 * cannot guarantee exactly-once delivery across cache eviction or service failure.
 */
const SUGGESTION_FORM_ID = '1TMStxvKo1rtEiBkiXxw7uLIV0B1397544jpKsRloqjk';
const RETRY_SECONDS = 21600;
const MAX_REQUEST_BYTES = 16000;
const MAX_SUBMISSIONS_PER_MINUTE = 120;
const SUGGESTION_FIELDS = [
  // The website needs either topic. The existing native form still requires
  // both fields; missing values are recorded explicitly as "Not specified".
  {key: 'gene', title: 'Gene', max: 60, formRequired: true},
  {key: 'condition', title: 'Condition', max: 160, formRequired: true},
  {key: 'phenotypes', title: 'Phenotypes', max: 2000, required: true, paragraph: true},
  {key: 'reference', title: 'Reference (optional)', max: 500},
  {key: 'name', title: 'Name (optional)', max: 100},
  {key: 'email', title: 'Email (optional)', max: 254}
];

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// Reports only protocol readiness. Does not open the form or expose responses.
function doGet() {
  return jsonOutput_({ok: true, service: 'gregor-suggestions', schema: 1});
}

function publicError_(message) {
  const error = new Error(message);
  error.isPublic = true;
  return error;
}

function validHostname_(value) {
  return value.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*\.?$/i.test(value);
}

function validReference_(value) {
  if (/[\s\\]/.test(value)) return false;
  const match = /^https?:\/\/([^/?#]+)(?:[/?#].*)?$/i.exec(value);
  if (!match || match[1].includes('@')) return false;
  const parts = match[1].split(':');
  if (parts.length > 2 || !validHostname_(parts[0])) return false;
  return parts.length === 1 || (/^\d{1,5}$/.test(parts[1]) && Number(parts[1]) > 0 && Number(parts[1]) <= 65535);
}

function validEmail_(value) {
  const parts = value.split('@');
  if (parts.length !== 2 || parts[0].length > 64 || !parts[0].length) return false;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/i.test(parts[0]) || /^\.|\.$|\.\./.test(parts[0])) return false;
  return parts[1].includes('.') && !parts[1].endsWith('.') && validHostname_(parts[1]);
}

function validatedPayload_(event) {
  const post = event && event.postData;
  if (!post || typeof post.contents !== 'string' || !/^text\/plain(?:\s*;|$)/i.test(post.type || '')) {
    throw publicError_('Please send this suggestion using the website form.');
  }
  if (post.contents.length > MAX_REQUEST_BYTES || Number(event.contentLength) > MAX_REQUEST_BYTES ||
      Utilities.newBlob(post.contents).getBytes().length > MAX_REQUEST_BYTES) {
    throw publicError_('This suggestion is too long. Please shorten it and try again.');
  }
  let input;
  try { input = JSON.parse(post.contents); } catch (_) { throw publicError_('The suggestion could not be read. Please try again.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw publicError_('The suggestion could not be read.');
  const allowed = ['requestId', 'website'].concat(SUGGESTION_FIELDS.map(function (field) { return field.key; }));
  if (Object.keys(input).some(function (key) { return !allowed.includes(key); })) throw publicError_('The suggestion contains an unsupported field.');
  if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw publicError_('Please refresh the page before sending your suggestion.');
  }
  if (input.website !== '') throw publicError_('The suggestion could not be accepted.');
  const result = {requestId: input.requestId.toLowerCase()};
  SUGGESTION_FIELDS.forEach(function (field) {
    let value = input[field.key];
    if (value === undefined && !field.required) value = '';
    if (typeof value !== 'string') throw publicError_('Please check the ' + field.key + ' field.');
    if (field.paragraph) value = value.replace(/\r\n/g, '\n');
    const controls = field.paragraph ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/;
    if (controls.test(value)) throw publicError_('Please remove unsupported characters from the ' + field.key + ' field.');
    value = value.trim();
    if ((field.required && !value) || value.length > field.max) throw publicError_('Please check the ' + field.key + ' field (maximum ' + field.max + ' characters).');
    result[field.key] = value;
    if (field.key === 'condition' && !result.gene && !result.condition) throw publicError_('Add a gene or condition.');
  });
  if (result.reference && !validReference_(result.reference)) throw publicError_('Please enter a valid http or https reference link without a username or password.');
  if (result.email && !validEmail_(result.email)) throw publicError_('Please enter a valid email address or leave email blank.');
  return result;
}

function checkedForm_(form) {
  if (!form.isAcceptingResponses()) throw publicError_('Suggestions are temporarily closed. Please try again later.');
  const items = form.getItems();
  if (items.length !== SUGGESTION_FIELDS.length) throw new Error('Form schema mismatch');
  return SUGGESTION_FIELDS.map(function (field) {
    const matches = items.filter(function (item) { return item.getTitle() === field.title; });
    const expected = field.paragraph ? FormApp.ItemType.PARAGRAPH_TEXT : FormApp.ItemType.TEXT;
    if (matches.length !== 1 || matches[0].getType() !== expected) throw new Error('Form schema mismatch');
    const typed = field.paragraph ? matches[0].asParagraphTextItem() : matches[0].asTextItem();
    if (typed.isRequired() !== Boolean(field.formRequired || field.required)) throw new Error('Form requirements mismatch');
    return typed;
  });
}

function doPost(event) {
  let lock;
  let locked = false;
  try {
    const input = validatedPayload_(event);
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(input), Utilities.Charset.UTF_8)
      .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) throw publicError_('The suggestion box is busy. Please wait a moment and try again.');
    const cache = CacheService.getScriptCache();
    const requestKey = 'suggestion:v1:' + input.requestId;
    const cached = cache.get(requestKey);
    if (cached) {
      const previous = JSON.parse(cached);
      if (previous.digest !== digest) throw publicError_('This request has changed. Please refresh the page before sending a new suggestion.');
      if (previous.status === 'saved' && typeof previous.receipt === 'string' && previous.receipt.length) {
        return jsonOutput_({ok: true, receipt: previous.receipt});
      }
      throw publicError_('We could not confirm the earlier attempt. To avoid duplicates, retries of this suggestion are paused for up to six hours.');
    }
    // A generous, shared circuit breaker, not a per-person identity or security boundary.
    // No IP address, account, email, or Origin header is used to identify visitors.
    const rateKey = 'suggestion:minute:' + Math.floor(Date.now() / 60000);
    const count = Number(cache.get(rateKey) || 0);
    if (!Number.isFinite(count) || count >= MAX_SUBMISSIONS_PER_MINUTE) throw publicError_('The suggestion box is busy. Please try again in a minute.');
    const form = FormApp.openById(SUGGESTION_FORM_ID);
    const items = checkedForm_(form);
    let response = form.createResponse();
    SUGGESTION_FIELDS.forEach(function (field, index) {
      const answer = input[field.key] || (field.formRequired ? 'Not specified' : '');
      if (answer) response = response.withItemResponse(items[index].createResponse(answer));
    });
    const receipt = Utilities.getUuid();
    // Do not store answers or email in the cache. A pending record limits retries
    // when Forms saves a response but a service error makes confirmation uncertain.
    cache.put(requestKey, JSON.stringify({digest: digest, status: 'pending'}), RETRY_SECONDS);
    const saved = response.submit();
    if (!saved || typeof saved.getId !== 'function' || !saved.getId()) throw new Error('Submission not confirmed');
    // After confirmed persistence, a cache failure must not turn success into failure.
    try {
      cache.put(requestKey, JSON.stringify({digest: digest, status: 'saved', receipt: receipt}), RETRY_SECONDS);
      cache.put(rateKey, String(count + 1), 120);
    } catch (_) { /* Cache is best effort; the form response is already saved. */ }
    return jsonOutput_({ok: true, receipt: receipt});
  } catch (error) {
    return jsonOutput_({ok: false, error: error && error.isPublic ? error.message : 'We could not confirm that your suggestion was saved. Please wait before trying again.'});
  } finally {
    if (lock && locked) {
      try { lock.releaseLock(); } catch (_) { /* Do not mask a confirmed response. */ }
    }
  }
}
