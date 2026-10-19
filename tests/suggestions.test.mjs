import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSuggestion,createSuggestionSession,sendSuggestion} from '../game/suggestions.mjs';

const values={gene:'FAM177A1',condition:'Example published condition',phenotypes:'Developmental delay\nHypotonia',reference:'',name:'',email:'',website:''};
const ids=['d2fbb2bb-e992-41f2-9535-fbf6f6692860','af591071-7183-4c92-b514-91d42f7c4706','3ad43a7f-d8ea-489c-9bee-de17e1532ac2'];
const endpoint='https://script.google.com/macros/s/AKfycb-TestReceiver/exec';
const payload={requestId:ids[0],...values};

test('suggestions accept anonymous input, normalize whitespace and preserve phenotype lines',()=>{
 assert.deepEqual(validateSuggestion({gene:' FAM177A1 ',condition:values.condition,phenotypes:'Developmental delay\r\nHypotonia'}),values);
 assert.deepEqual(validateSuggestion({...values,name:' Sasha ',email:' test@example.org '}),{...values,name:'Sasha',email:'test@example.org'});
});

test('suggestions reject missing required values, oversize fields and unsupported controls',()=>{
 for(const key of ['gene','condition','phenotypes'])assert.throws(()=>validateSuggestion({...values,[key]:'  '}),error=>error.field===key);
 for(const [key,max] of [['gene',60],['condition',160],['phenotypes',2000],['reference',500],['name',100],['email',254]])assert.throws(()=>validateSuggestion({...values,[key]:'x'.repeat(max+1)}),error=>error.field===key);
 for(const key of ['gene','condition','phenotypes','name'])assert.throws(()=>validateSuggestion({...values,[key]:'before\u0000after'}),error=>error.field===key);
 assert.throws(()=>validateSuggestion({...values,gene:'FAM\n177A1'}),error=>error.field==='gene');
 assert.throws(()=>validateSuggestion({...values,condition:42}),/must be text/);
 assert.throws(()=>validateSuggestion({...values,website:'https://spam.example'}),/could not be sent/);
});

test('optional email and public references reject unsafe or incomplete input',()=>{
 for(const email of ['test','user@','a@example.org\nb@example.org','a b@example.org','a..b@example.org','é@example.org','a@-bad.example','a@example.org.'])assert.throws(()=>validateSuggestion({...values,email}),error=>error.field==='email');
 for(const reference of ['javascript:alert(1)','data:text/plain,test','https://user:secret@example.org/','example.org/paper','https://example.org/a b','https://example.org\\path','https://éxample.org/paper','https://example.org:65536/paper'])assert.throws(()=>validateSuggestion({...values,reference}),error=>error.field==='reference');
 for(const reference of ['https://omim.org/entry/123456','http://example.org/paper?a=b#figure'])assert.equal(validateSuggestion({...values,reference}).reference,reference);
});

test('unchanged retries retain their request ID; edits and confirmed resets create a new one',()=>{
 let index=0;const session=createSuggestionSession({uuid:()=>ids[index++]});
 assert.equal(session.prepare(values).requestId,ids[0]);
 assert.equal(session.prepare({...values,gene:' FAM177A1 '}).requestId,ids[0]);
 const changed={...values,name:'Reviewer'};
 assert.equal(session.prepare(changed).requestId,ids[1]);
 assert.equal(session.prepare(changed).requestId,ids[1]);
 session.clear();assert.equal(session.prepare(changed).requestId,ids[2]);
 assert.equal(index,3);
});

test('submission sends CORS JSON only to the receiver and requires its confirmed receipt',async()=>{
 let call;const controller=new AbortController();
 const receipt=await sendSuggestion({...payload,name:'Reviewer',email:'reviewer@example.org'},{endpoint,signal:controller.signal,fetchImpl:async(url,options)=>{call={url,options};return {ok:true,json:async()=>({ok:true,receipt:ids[0]})};}});
 assert.deepEqual(receipt,{receipt:ids[0]});assert.equal(call.url,endpoint);
 assert.equal(call.options.method,'POST');assert.equal(call.options.mode,'cors');assert.equal(call.options.credentials,'omit');assert.equal(call.options.headers['Content-Type'],'text/plain;charset=utf-8');
 assert.equal(call.options.signal,controller.signal);assert.equal(call.options.cache,'no-store');
 assert.deepEqual(JSON.parse(call.options.body),{...payload,name:'Reviewer',email:'reviewer@example.org'});
 assert.ok(!call.url.includes('reviewer'));
});

test('network errors, opaque/failed responses, and malformed receipts never become success',async()=>{
 const badResponses=[
  {ok:false,json:async()=>({ok:true,receipt:ids[0]})},
  {ok:true,json:async()=>{throw new SyntaxError('not JSON');}},
  ...[{}, {ok:true}, {ok:'true',receipt:ids[0]}, {ok:true,receipt:''}, {ok:true,receipt:42}, {ok:true,receipt:'bad\u0000receipt'}].map(result=>({ok:true,json:async()=>result})),
 ];
 for(const response of badResponses)await assert.rejects(sendSuggestion(payload,{endpoint,fetchImpl:async()=>response}),/could not confirm/);
 await assert.rejects(sendSuggestion(payload,{endpoint,fetchImpl:async()=>{throw new TypeError('Failed to fetch');}}),TypeError);
 await assert.rejects(sendSuggestion(payload,{endpoint,fetchImpl:async()=>({ok:true,json:async()=>({ok:false,error:'Please try again later.'})})}),/Please try again later/);
});

test('invalid payload or non-receiver destination is rejected before contacting a server',async()=>{
 let contacted=false;const fetchImpl=async()=>{contacted=true;throw Error('unexpected request');};
 for(const destination of ['', 'https://example.org/collect','https://script.google.com/macros/s/id/exec?redirect=elsewhere','http://script.google.com/macros/s/id/exec'])await assert.rejects(sendSuggestion(payload,{endpoint:destination,fetchImpl}),/temporarily unavailable/);
 await assert.rejects(sendSuggestion({...payload,requestId:'not-a-uuid'},{endpoint,fetchImpl}),/reload/);
 await assert.rejects(sendSuggestion({...payload,gene:''},{endpoint,fetchImpl}),/Please enter/);
 assert.equal(contacted,false);
});
