import test from 'node:test';
import assert from 'node:assert/strict';
import {workStatuses,canComplete} from '../frontend/ticket-workflow.js';
const ticket={employee:'creator',assigned_to:'assignee',status:'Open'};
test('assignee works a ticket; creator confirms resolution',()=>{assert.deepEqual(workStatuses(ticket,{id:'assignee',department:'HR'}),['Open','In Progress','Resolved']);assert.deepEqual(workStatuses(ticket,{id:'creator',department:'HR'}),[]);assert.equal(canComplete({...ticket,status:'Resolved'},{id:'creator'}),true);assert.equal(canComplete({...ticket,status:'Resolved'},{id:'assignee'}),false);assert.equal(canComplete(ticket,{id:'creator'}),false);});
test('completed tickets have no status changes',()=>{assert.deepEqual(workStatuses({...ticket,status:'Completed'},{id:'it',department:'IT'}),[]);});
