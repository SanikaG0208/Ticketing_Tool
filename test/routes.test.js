import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedPage } from '../frontend/route-access.js';
test('signed out users cannot open any workspace route',()=>{
  for(const page of ['tickets','users','departments','types'])assert.equal(protectedPage(page,null),'login');
});
test('department role controls direct administration routes',()=>{
  for(const page of ['users','departments','types']) {
    assert.equal(protectedPage(page,{department:'HR'}),'tickets');
    assert.equal(protectedPage(page,{department:'IT'}),page);
  }
});
