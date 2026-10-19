// Build a public, moderated snapshot. Never publish the token or raw issue body.
import {writeFile} from 'node:fs/promises';
import {loadLeaderboard} from '../game/community.mjs';
const token=process.env.GITHUB_TOKEN;
const scores=await loadLeaderboard({
 signal:AbortSignal.timeout(45000),
 fetchImpl:(url,options)=>fetch(url,{...options,headers:{...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}}),
});
await writeFile(new URL('../dist/leaderboard.json',import.meta.url),JSON.stringify({version:1,updatedAt:new Date().toISOString(),scores})+'\n');
console.log(`Published leaderboard snapshot: ${scores.length} reviewed submissions.`);
