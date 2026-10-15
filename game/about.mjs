import {renderSite} from './site.mjs';
import {findRound} from './rounds.mjs';

const round=findRound(new URLSearchParams(location.search).get('level')??'01');
renderSite({active:'about',roundNumber:round.number});
for(const [id,page] of [['aboutPlay','./'],['aboutScience','./science.html'],['aboutReview','./review.html']])document.getElementById(id).href=`${page}?level=${round.number}`;
