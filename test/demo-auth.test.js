import test from 'node:test';
import assert from 'node:assert/strict';
import { hashDemoPassword, verifyDemoPassword, seedCredential } from '../frontend/demo-auth.js';

test('demo authentication rejects empty and incorrect passwords', async () => {
  assert.equal(await verifyDemoPassword('',seedCredential),false);
  assert.equal(await verifyDemoPassword('incorrect',seedCredential),false);
  assert.equal(await verifyDemoPassword('DemoFixtureOnly123!',seedCredential),true);
});
test('new employee passwords use salted hashes and support login', async () => {
  const first=await hashDemoPassword('EmployeePassword123!');
  const second=await hashDemoPassword('EmployeePassword123!');
  assert.notEqual(first.salt,second.salt);
  assert.notEqual(first.hash,second.hash);
  assert.equal(await verifyDemoPassword('EmployeePassword123!',first),true);
  assert.equal(await verifyDemoPassword('DemoFixtureOnly123!',first),false);
  assert.equal(JSON.stringify(first).includes('EmployeePassword123!'),false);
});
