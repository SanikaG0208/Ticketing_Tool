import test from 'node:test';
import assert from 'node:assert/strict';
import { employeesForDepartment, validTicketRecipient, typesForDepartment, validTicketCategory } from '../frontend/ticket-routing.js';

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
test('HR requests expose payroll subtypes and reject IT categories',()=>{
  const types=[{department:'HR',name:'Payroll',subtypes:['Salary issue','Deduction issue']},{department:'IT',name:'Hardware',subtypes:['Laptop']}];
  assert.deepEqual(typesForDepartment(types,'HR').map(type=>type.name),['Payroll']);
  assert.equal(validTicketCategory(types,'HR','Payroll','Salary issue'),true);
  assert.equal(validTicketCategory(types,'HR','Payroll','Deduction issue'),true);
  assert.equal(validTicketCategory(types,'HR','Hardware','Laptop'),false);
  assert.equal(validTicketCategory(types,'HR','Payroll','Laptop'),false);
  assert.deepEqual(typesForDepartment(types,'QA'),[]);
});
