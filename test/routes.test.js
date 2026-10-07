import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedPage } from '../frontend/route-access.js';
test('signed out users cannot open any workspace route',()=>{
  for(const page of ['tickets','users','departments','types'])assert.equal(protectedPage(page,null),'login');
});
test('department role controls direct administration routes',()=>{
  for(const page of ['users','departments']) {
    assert.equal(protectedPage(page,{department:'HR'}),'tickets');
    assert.equal(protectedPage(page,{department:'IT'}),page);
  }
});
test('management insights are restricted to IT',()=>{
 assert.equal(protectedPage('insights',{department:'HR'}),'tickets');
 assert.equal(protectedPage('insights',{department:'IT'}),'insights');
});

test('removed category route returns to tickets',()=>assert.equal(protectedPage('types',{department:'IT'}),'tickets'));
