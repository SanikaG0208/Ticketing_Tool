import test from 'node:test';
import assert from 'node:assert/strict';
import { schemas, validate } from '../src/validation.js';
import { credentialMessage, sendEmployeeCredentials } from '../src/onboarding.js';

test('employee creation requires a password of at least 12 characters', () => {
  const employee = { name:'Test Employee', email:'employee@example.com', department_id:'123e4567-e89b-42d3-a456-426614174000' };
  assert.throws(() => validate(schemas.user, employee));
  assert.throws(() => validate(schemas.user, {...employee,password:'short'}));
  assert.equal(validate(schemas.user,{...employee,password:'TestPassword123!'}).password,'TestPassword123!');
});

test('credential email is addressed to the new employee and includes login details', () => {
  const message = credentialMessage({name:'Test Employee',email:'employee@example.com',password:'TestPassword123!'},'https://desk.example.com');
  assert.equal(message.to,'employee@example.com');
  assert.match(message.text,/https:\/\/desk.example.com/);
  assert.match(message.text,/Email: employee@example.com/);
  assert.match(message.text,/Password: TestPassword123!/);
});

test('missing SMTP reports not configured, never successful delivery', async () => {
  const old = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  try { assert.equal(await sendEmployeeCredentials({}), 'not_configured'); }
  finally { if(old !== undefined) process.env.SMTP_HOST=old; }
});
