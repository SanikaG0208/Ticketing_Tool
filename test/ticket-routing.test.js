import test from 'node:test';
import assert from 'node:assert/strict';
import { employeesForDepartment, validTicketRecipient } from '../frontend/ticket-routing.js';

const users=[{id:'it',department:'IT',is_poc:true},{id:'hr',department:'HR',is_poc:true},{id:'inactive',department:'IT',active:false,is_poc:true},{id:'non-poc',department:'IT',active:true,is_poc:false}];
test('employee dropdown contains only active designated POCs of the selected department',()=>{
  assert.deepEqual(employeesForDepartment(users,'IT').map(user=>user.id),['it']);
  assert.deepEqual(employeesForDepartment(users,'QA'),[]);
});
test('ticket recipient must belong to its department',()=>{
  assert.equal(validTicketRecipient(users,'IT','it'),true);
  assert.equal(validTicketRecipient(users,'IT','hr'),false);
  assert.equal(validTicketRecipient(users,'IT','inactive'),false);
  assert.equal(validTicketRecipient(users,'IT',''),false);
  assert.equal(validTicketRecipient(users,'IT','non-poc'),false);
});
