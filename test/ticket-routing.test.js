import test from 'node:test';
import assert from 'node:assert/strict';
import { employeesForDepartment, validTicketRecipient,pocSelection } from '../frontend/ticket-routing.js';

const users=[{id:'it',department:'IT',is_poc:true},{id:'hr',department:'HR',is_poc:true},{id:'inactive',department:'IT',active:false,is_poc:true},{id:'non-poc',department:'IT',active:true,is_poc:false}];
test('employee dropdown contains active employees of the selected department',()=>{
  assert.deepEqual(employeesForDepartment(users,'IT').map(user=>user.id),['it','non-poc']);
  assert.deepEqual(employeesForDepartment(users,'QA'),[]);
});
test('ticket recipient must belong to its department',()=>{
  assert.equal(validTicketRecipient(users,'IT','it'),true);
  assert.equal(validTicketRecipient(users,'IT','hr'),false);
  assert.equal(validTicketRecipient(users,'IT','inactive'),false);
  assert.equal(validTicketRecipient(users,'IT',''),false);
  assert.equal(validTicketRecipient(users,'IT','non-poc'),true);
});

test('tracking POC auto selection and multiple POC selection',()=>{
 const users=[{id:'a',department:'IT',is_poc:true},{id:'b',department:'IT',is_poc:true},{id:'c',department:'IT',is_poc:false}];
 assert.equal(pocSelection(users,'IT','c').disabled,false);
 assert.equal(pocSelection(users,'IT','c','b').value,'b');
 assert.equal(pocSelection(users,'IT','a','b').value,'a');
 assert.equal(pocSelection(users,'IT','a').disabled,true);
 assert.equal(pocSelection(users.slice(1),'IT','c').value,'b');
 assert.equal(pocSelection(users.slice(1),'IT','c').disabled,true);
 assert.equal(pocSelection(users,'HR','c','a').value,'');
});
