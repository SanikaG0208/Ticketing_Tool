import test from 'node:test';import assert from 'node:assert/strict';
import {teamTicketReport} from '../frontend/views/admin/team-ticket-report.js';
test('team report separates ticket departments, status counts and reassignment flags',()=>{
 const t=(id,name,status,flag=false)=>({department_id:id,departments:{name},status,needs_reassignment:flag});
 const rows=teamTicketReport([t('it','IT','Open',true),t('it','IT','Completed'),t('it','IT','Closed'),t('hr','HR','Waiting')]);
 assert.equal(rows[0].total,3);assert.equal(rows[0].closed,2);assert.equal(rows[0].open,1);assert.equal(rows[0].reassignment,1);assert.equal(rows[1].waiting,1);assert.deepEqual(teamTicketReport([]),[]);
});
