// Public receiver URL only. Credentials and Google Form access stay server-side.
export const SUGGESTION_ENDPOINT='https://script.google.com/macros/s/AKfycbwcREMAEUME5rnnNeF3B093n2rJDps2vN7hXcsf7l8W-TRlyvk7sQ3CM2CEsXeEUSOCAw/exec';
export const SUGGESTION_FORM_URL='https://docs.google.com/forms/d/e/1FAIpQLSfp7A0Q9Izf9Fuy1ro7PaoQm120WlTLA4MNQNuBnbaQWN1ekg/viewform';
const fields=[['gene','Gene',60,true],['condition','Condition',160,true],['phenotypes','Phenotypes',2000,true],['reference','Reference',500,false],['name','Name',100,false],['email','Email',254,false],['website','Website',500,false]];
const controls=/[\u0000-\u001f\u007f-\u009f]/;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Keep these conservative checks aligned with server/google-forms/Code.gs.
function validHostname(value){return value.length<=253&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*\.?$/i.test(value);}
function validEmail(value){const parts=value.split('@');return parts.length===2&&parts[0].length>0&&parts[0].length<=64&&/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/i.test(parts[0])&&!/^\.|\.$|\.\./.test(parts[0])&&parts[1].includes('.')&&!parts[1].endsWith('.')&&validHostname(parts[1]);}
function validReference(value){if(/[\s\\]/.test(value))return false;const match=/^https?:\/\/([^/?#]+)(?:[/?#].*)?$/i.exec(value);if(!match||match[1].includes('@'))return false;const parts=match[1].split(':');return parts.length<=2&&validHostname(parts[0])&&(parts.length===1||(/^\d{1,5}$/.test(parts[1])&&Number(parts[1])>0&&Number(parts[1])<=65535));}
function invalid(field,message){const error=new Error(message);error.field=field;throw error;}
export function validateSuggestion(values){
 const result={};
 for(const [key,label,limit,required] of fields){
  const original=values?.[key]??'';
  if(typeof original!=='string')invalid(key,`${label} must be text.`);
  const normalized=key==='phenotypes'?original.replace(/\r\n/g,'\n'):original;
  if(controls.test(key==='phenotypes'?normalized.replace(/\n/g,''):normalized))invalid(key,`Remove unsupported characters from ${label.toLowerCase()}.`);
  const value=normalized.trim();
  if(required&&!value)invalid(key,`Please enter ${label.toLowerCase()}.`);
  if(value.length>limit)invalid(key,`Keep ${label.toLowerCase()} to ${limit} characters or fewer.`);
  result[key]=value;
 }
 if(result.email&&!validEmail(result.email))invalid('email','Enter a complete email address, or leave it blank.');
 if(result.reference&&!validReference(result.reference))invalid('reference','Use a public http:// or https:// reference link without sign-in details.');
 if(result.website)invalid('website','Your suggestion could not be sent. Please try again.');
 return result;
}
export function createSuggestionSession({uuid=()=>crypto.randomUUID()}={}){
 let fingerprint='',requestId='';
 return {
  prepare(values){const payload=validateSuggestion(values),next=JSON.stringify(payload);if(next!==fingerprint||!requestId){requestId=uuid();fingerprint=next;}return {requestId,...payload};},
  clear(){fingerprint='';requestId='';},
 };
}
export async function sendSuggestion(payload,{endpoint=SUGGESTION_ENDPOINT,fetchImpl=globalThis.fetch,signal}={}){
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint))throw new Error('The suggestion form is temporarily unavailable. Please use the alternative form below.');
 if(!uuidPattern.test(payload?.requestId??''))throw new Error('Please reload the page and try again.');
 const body={requestId:payload.requestId,...validateSuggestion(payload)};
 const response=await fetchImpl(endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal});
 if(!response.ok)throw new Error('We could not confirm receipt. Your text is still here; please try again.');
 let result;try{result=await response.json();}catch{throw new Error('We could not confirm receipt. Your text is still here; please try again.');}
 if(result?.ok!==true||typeof result.receipt!=='string'||!result.receipt.trim()||result.receipt.length>200||controls.test(result.receipt)){
  const message=result?.ok===false&&typeof result.error==='string'&&result.error.length<=280&&!controls.test(result.error)?result.error:'We could not confirm receipt. Your text is still here; please try again.';
  throw new Error(message);
 }
 return {receipt:result.receipt};
}
export function initSuggestionForm(doc=document){
 const form=doc.getElementById('suggestionForm');if(!form)return;
 const fields=doc.getElementById('suggestionFields'),button=doc.getElementById('suggestionSubmit'),status=doc.getElementById('suggestionStatus'),success=doc.getElementById('suggestionSuccess'),fallback=doc.getElementById('suggestionFallback');
 const session=createSuggestionSession();let pending=false;
 fields.disabled=false;
 form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;
  let payload;
  try{payload=session.prepare(Object.fromEntries(new FormData(form)));}catch(error){const field=form.elements.namedItem(error.field);if(field&&error.field!=='website'){field.setCustomValidity(error.message);field.reportValidity();field.focus();}else{status.textContent=error.message;status.focus();}return;}
  pending=true;fields.disabled=true;button.textContent='Sending…';fields.setAttribute('aria-busy','true');status.textContent='Sending your suggestion…';fallback.hidden=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  try{
   await sendSuggestion(payload,{signal:controller.signal});
   session.clear();form.reset();form.hidden=true;success.hidden=false;success.focus();
  }catch(error){
   status.textContent=error?.name==='AbortError'?'We could not confirm receipt in time. Your text is still here. Please wait a moment, then try again.':error instanceof TypeError?'We could not confirm receipt. Check your connection and try again; your text is still here.':error.message||'We could not confirm receipt. Please try again.';
   fallback.hidden=false;button.textContent='Try again';status.focus();
  }finally{clearTimeout(timeout);pending=false;fields.disabled=false;fields.removeAttribute('aria-busy');if(form.hidden)button.textContent='Send suggestion';}
 });
 doc.getElementById('suggestionAnother').addEventListener('click',()=>{success.hidden=true;form.hidden=false;status.textContent='';fallback.hidden=true;form.elements.namedItem('gene').focus();});
}
