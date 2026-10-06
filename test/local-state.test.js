import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocalState, STORAGE_KEY } from '../frontend/local-state.js';

function storageWith(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { getItem:key=>map.get(key)||null, removeItem:key=>map.delete(key), map };
}
test('reset removes the old demo and keeps only Manik and IT',()=>{
  const storage = storageWith({'desk-demo-v1':JSON.stringify({users:[{name:'Old Employee'}]})});
  const state = loadLocalState(storage);
  assert.equal(storage.map.has('desk-demo-v1'),false);
  assert.equal(state.users.length,1);
  assert.equal(state.users[0].name,'Manik Joshi');
  assert.equal(state.users[0].email,'manik@b2bindemand.com');
  assert.deepEqual(state.departments,['IT']);
  assert.deepEqual(state.types,[]);
  assert.deepEqual(state.tickets,[]);
});
test('manually added data survives subsequent loads',()=>{
  const state=loadLocalState(storageWith());
  state.departments.push('HR');
  state.types.push({department:'HR',name:'Payroll',subtypes:['Salary issue']});
  assert.deepEqual(loadLocalState(storageWith({[STORAGE_KEY]:JSON.stringify(state)})),state);
});
