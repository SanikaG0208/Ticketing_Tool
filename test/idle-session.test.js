import test from 'node:test';
import assert from 'node:assert/strict';
import {IDLE_LIMIT,idleState,readActivity,activityKey} from '../frontend/auth/idle-session.js';
import {saveDraft,readDraft,clearDraft} from '../frontend/auth/drafts.js';
test('idle warning starts at 29 minutes; expiry occurs exactly at 30 minutes',()=>{
 const start=100000;
 assert.equal(idleState(start,start+29*60000-1).warning,false);
 assert.equal(idleState(start,start+29*60000).warning,true);
 assert.equal(idleState(start,start+IDLE_LIMIT-1).expired,false);
 assert.equal(idleState(start,start+IDLE_LIMIT).expired,true);
 assert.equal(idleState(start,start+IDLE_LIMIT+50000).remaining,0);
});
test('shared activity survives reload and another tab can extend inactivity deadline',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 storage.setItem(activityKey('a'),'1000');assert.equal(readActivity(storage,'a',2000),1000);
 storage.setItem(activityKey('a'),'1900');assert.equal(readActivity(storage,'a',2000),1900);
 assert.equal(readActivity(storage,'b',2000),2000);
 assert.equal(readActivity({getItem:()=>{throw Error();}},'a',2000),2000);
});
test('drafts are isolated by employee and ticket and cleared after submission',()=>{
 const values=new Map();globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 saveDraft('a','comment:one',{comment:'Unsent update'});
 assert.equal(readDraft('a','comment:one').comment,'Unsent update');
 assert.deepEqual(readDraft('b','comment:one'),{});assert.deepEqual(readDraft('a','comment:two'),{});
 clearDraft('a','comment:one');assert.deepEqual(readDraft('a','comment:one'),{});
 delete globalThis.sessionStorage;
});
