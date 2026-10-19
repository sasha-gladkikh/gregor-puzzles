import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPOSITORY = 'sasha-gladkikh/gregor-puzzles';
const LABEL = 'leaderboard';

// Only the dedicated issue-edit job receives a write-capable token. All request
// destinations and label names are fixed; event strings are never shell code.
export async function revokeScoreApproval({issueNumber, repository, token, fetchImpl = fetch, signal} = {}) {
  if (repository !== REPOSITORY) throw new Error('Score approval can only be changed in the GREGoR Puzzles repository.');
  const number = String(issueNumber ?? '');
  if (!/^[1-9]\d*$/.test(number) || !Number.isSafeInteger(Number(number))) throw new Error('A valid issue number is required.');
  if (typeof token !== 'string' || !token.trim()) throw new Error('The issue-edit job requires its GitHub token.');
  const issueURL = `https://api.github.com/repos/${REPOSITORY}/issues/${number}`;
  const headers = {Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`};
  const response = await fetchImpl(`${issueURL}/labels/${LABEL}`, {method: 'DELETE', headers, signal, redirect: 'error'});
  if (response.status === 200) {
    const labels = await response.json();
    if (!Array.isArray(labels) || labels.some(label => label?.name === LABEL)) throw new Error('GitHub did not confirm removal of the leaderboard label.');
    return {removed: true, issueNumber: Number(number)};
  }
  // A repeated event may find the label already removed. Verify that condition
  // rather than treating a permission-related 404 as successful revocation.
  if (response.status === 404) {
    const check = await fetchImpl(issueURL, {headers, signal, redirect: 'error'});
    if (check.status === 200) {
      const issue = await check.json();
      if (issue?.number === Number(number) && issue.html_url === `https://github.com/${REPOSITORY}/issues/${number}` && Array.isArray(issue.labels) && !issue.labels.some(label => label?.name === LABEL)) return {removed: false, issueNumber: Number(number)};
    }
  }
  throw new Error(`Could not revoke edited score approval (GitHub ${response.status}); the leaderboard must not refresh until this succeeds.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await revokeScoreApproval({
    issueNumber: process.env.ISSUE_NUMBER,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN,
    signal: AbortSignal.timeout(20000),
  });
  console.log(`Issue #${result.issueNumber}: ${result.removed ? 'leaderboard approval removed; re-review required' : 'approval already absent'}.`);
}
