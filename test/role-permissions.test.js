import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdmin,canManageTicket,canViewTicket,canEditTicketDetails} from '../frontend/auth/permissions.js';
const ticket={employee:'creator',assigned_to:'poc1',department_id:'it'};
test('IT membership does not grant Admin privileges',()=>{assert.equal(isAdmin({department:'IT',role:'employee'}),false);assert.equal(isAdmin({department:'HR',role:'admin'}),true);});
test('POC sees department tickets but only manages personally assigned tickets',()=>{const poc={id:'poc2',is_poc:true,role:'employee',department_id:'it'};assert.equal(canViewTicket(ticket,poc),true);assert.equal(canManageTicket(ticket,poc),false);assert.equal(canViewTicket({...ticket,department_id:'hr'},poc),false);assert.equal(canManageTicket({...ticket,department_id:'hr'},poc),false);assert.equal(canManageTicket({...ticket,assigned_to:'poc2'},poc),true);});
test('Employee visibility covers own raised/received tickets only',()=>{assert.equal(canViewTicket(ticket,{id:'creator',role:'employee'}),true);assert.equal(canViewTicket(ticket,{id:'poc1',role:'employee'}),true);assert.equal(canViewTicket(ticket,{id:'other',department_id:'it',role:'employee'}),false);assert.equal(canManageTicket(ticket,{id:'poc1',role:'employee'}),true);});
test('Admin sees and manages all departments',()=>{const admin={id:'admin',role:'admin'};assert.equal(canViewTicket(ticket,admin),true);assert.equal(canManageTicket(ticket,admin),true);});

test('Only creator or Admin can edit ticket details, with completed tickets locked',()=>{const open={...ticket,status:'Open'};assert.equal(canEditTicketDetails(open,{id:'creator'}),true);assert.equal(canEditTicketDetails(open,{id:'poc1'}),false);assert.equal(canEditTicketDetails(open,{id:'poc2',is_poc:true,department_id:'it'}),false);assert.equal(canEditTicketDetails(open,{role:'admin'}),true);assert.equal(canEditTicketDetails({...open,status:'Completed'},{id:'creator',role:'admin'}),false);});
