import test from 'node:test';
import assert from 'node:assert/strict';
import { employeesForDepartment, validTicketRecipient } from '../frontend/ticket-routing.js';

const users=[{id:'it',department:'IT'},{id:'hr',department:'HR'},{id:'inactive',department:'IT',active:false}];
test('employee dropdown contains only active employees of the selected department',()=>{
  assert.deepEqual(employeesForDepartment(users,'IT').map(user=>user.id),['it']);
  assert.deepEqual(employeesForDepartment(users,'QA'),[]);
});
test('ticket recipient must belong to its department',()=>{
  assert.equal(validTicketRecipient(users,'IT','it'),true);
  assert.equal(validTicketRecipient(users,'IT','hr'),false);
  assert.equal(validTicketRecipient(users,'IT','inactive'),false);
  assert.equal(validTicketRecipient(users,'IT',''),false);
});
