import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedPage } from '../frontend/route-access.js';
test('signed out users cannot open any workspace route',()=>{
  for(const page of ['tickets','users','departments','types'])assert.equal(protectedPage(page,null),'login');
});
test('explicit Admin role controls direct administration routes',()=>{
  for(const page of ['users','departments']) {
    assert.equal(protectedPage(page,{department:'HR'}),'tickets');
    assert.equal(protectedPage(page,{department:'IT',role:'employee',is_poc:true}),'tickets');
    assert.equal(protectedPage(page,{department:'IT',role:'admin'}),page);
  }
});
test('management insights are restricted to Admin',()=>{
 assert.equal(protectedPage('insights',{department:'HR'}),'tickets');
 assert.equal(protectedPage('insights',{department:'IT',role:'admin'}),'insights');
});

test('removed category route returns to tickets',()=>assert.equal(protectedPage('types',{department:'IT',role:'admin'}),'tickets'));

test('Admin reporting routes reject POC and Employee direct navigation',()=>{
 for(const page of ['dashboard','downtime','sla','team-performance','reports','export']){
  assert.equal(protectedPage(page,{role:'admin'}),page);
  assert.equal(protectedPage(page,{role:'employee',is_poc:true,department:'IT'}),'tickets');
  assert.equal(protectedPage(page,{role:'employee'}),'tickets');
 }
});
