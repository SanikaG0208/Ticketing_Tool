import test from 'node:test';
import assert from 'node:assert/strict';
import {accountDisposition} from '../supabase/functions/ticketing-admin/account-disposition.mjs';
test('returning employees reuse a departed account; active or unrelated inactive accounts are not restored',()=>{
 assert.equal(accountDisposition(null),'create');
 assert.equal(accountDisposition({id:'original',active:false,left_at:'2026-10-16T08:00:00Z'}),'reactivate');
 assert.equal(accountDisposition({active:true,left_at:'2026-10-16T08:00:00Z'}),'duplicate');
 assert.equal(accountDisposition({active:false,left_at:null}),'duplicate');
});
