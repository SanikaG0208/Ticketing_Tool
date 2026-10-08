import test from 'node:test';
import assert from 'node:assert/strict';
import {workStatuses,canComplete,canReopen} from '../frontend/ticket-workflow.js';
const ticket={employee:'creator',assigned_to:'assignee',department_id:'hr',status:'Open'};
test('assignee works a ticket; creator confirms resolution',()=>{assert.deepEqual(workStatuses(ticket,{id:'assignee',department:'HR',department_id:'hr',is_poc:true}),['Open','In Progress','Waiting','Resolved']);assert.deepEqual(workStatuses(ticket,{id:'creator',department:'HR'}),[]);assert.equal(canComplete({...ticket,status:'Resolved'},{id:'creator'}),true);assert.equal(canComplete({...ticket,status:'Resolved'},{id:'assignee'}),false);assert.equal(canComplete(ticket,{id:'creator'}),false);});
test('completed tickets have no status changes',()=>{assert.deepEqual(workStatuses({...ticket,status:'Completed'},{id:'it',department:'IT'}),[]);});

test('only the creator can reopen a resolved or completed ticket',()=>{for(const status of ['Resolved','Completed']){assert.equal(canReopen({...ticket,status},{id:'creator'}),true);assert.equal(canReopen({...ticket,status},{id:'assignee',department:'IT'}),false);}assert.equal(canReopen(ticket,{id:'creator'}),false);});
