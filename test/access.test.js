import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticate, requireIT } from '../src/auth.js';
import { schemas, validate, screenshotType } from '../src/validation.js';

test('employees cannot use IT administration endpoints', () => {
  let error;
  requireIT({ profile:{ departments:{ name:'HR' } } }, {}, e => { error=e; });
  assert.equal(error.status,403);
  requireIT({ profile:{ departments:{ name:'IT' } } }, {}, e => { error=e; });
  assert.equal(error,undefined);
});
test('authentication rejects missing and invalid sessions',async () => {
  const middleware=createAuthenticate(() => ({ auth:{ getUser:async()=>({ error:new Error(), data:null }) } }));
  let error;
  await middleware({ headers:{} },{},e=>{ error=e; });
  assert.equal(error.status,401);
  await middleware({ headers:{ authorization:'Bearer invalid' } },{},e=>{ error=e; });
  assert.equal(error.status,401);
});
test('unprovisioned accounts cannot access employee APIs',async () => {
  const client={ auth:{ getUser:async()=>({ data:{user:{id:'test'}} }) },from:()=>({ select:()=>({ eq:()=>({ maybeSingle:async()=>({data:null}) }) }) }) };
  let error;
  await createAuthenticate(()=>client)({headers:{authorization:'Bearer valid'}},{},e=>{error=e;});
  assert.equal(error.status,403);
});
test('ticket input rejects employee spoofing and invalid priority', () => {
  const body={assigned_to:'123e4567-e89b-42d3-a456-426614174003',department_id:'123e4567-e89b-42d3-a456-426614174000',type_id:'123e4567-e89b-42d3-a456-426614174001',subtype_id:'123e4567-e89b-42d3-a456-426614174002',requirements:'Laptop',description:'Unable to sign in',priority:'Medium'};
  assert.equal(validate(schemas.ticket,body).send_email,false);
  assert.throws(()=>validate(schemas.ticket,{...body,employee_id:body.department_id}));
  assert.throws(()=>validate(schemas.ticket,{...body,priority:'Urgent'}));
  assert.throws(()=>validate(schemas.ticket,{...body,requirements:'  '}));
});
test('pagination and screenshot formats are bounded', () => {
  assert.throws(()=>validate(schemas.pagination,{limit:101}));
  assert.throws(()=>validate(schemas.pagination,{page:0}));
  assert.equal(screenshotType(Buffer.from('<svg></svg>')),null);
  assert.equal(screenshotType(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png');
});
