// Scientific sign-off for each round. A reviewer records each check after reading the
// round in Editorial review (docs/REVIEW.md). Dates use YYYY-MM-DD.
// Set requireApproval to true to publish only fully approved rounds.
export const requireApproval=false;

export const checks=[
 ['association','Gene–condition association, inheritance, and variant mechanism'],
 ['clinical','Clinical pattern, course, and caveat'],
 ['illustration','Illustration, landmarks, and mechanism figure'],
 ['takeaway','Completion card connection and wording']
];
const pending=()=>({status:'pending',reviewer:'',date:'',checks:Object.fromEntries(checks.map(([key])=>[key,false]))});

export const signoff={
 'clcn1-recessive-v1':pending(),
 'gjb2-dfnb1a-v1':pending(),
 'slc29a3-hlps-v1':pending(),
 'sbds-sds1-v1':pending(),
 'rnu4-2-renu-v1':pending(),
 'cacna1a-dee42-v1':pending(),
 'ptpn11-noonan1-v1':pending(),
 'rnu4atac-roifman-v1':pending(),
 'sting1-savi-v1':pending(),
 'fgf14-sca27b-v1':pending()
};

export const isApproved=entry=>entry?.status==='approved'&&checks.every(([key])=>entry.checks?.[key]===true)&&Boolean(entry.reviewer&&entry.date);
