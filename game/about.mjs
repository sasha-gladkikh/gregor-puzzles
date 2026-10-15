import {renderSite} from './site.mjs';
import {allRounds,findRound} from './rounds.mjs';
import {isApproved} from './signoff.mjs';

const round=findRound(new URLSearchParams(location.search).get('level')??'01');
renderSite({active:'about',roundNumber:round.number});
for(const [id,page] of [['aboutPlay','./'],['aboutScience','./science.html'],['aboutReview','./review.html']])document.getElementById(id).href=`${page}?level=${round.number}`;
const approved=allRounds.filter(item=>isApproved(item.signoff)).length;
const status=approved===allRounds.length?'Scientific review complete':`${approved} of ${allRounds.length} rounds approved`;
document.getElementById('aboutStatus').textContent=status;
document.getElementById('reviewSummary').textContent=status;
