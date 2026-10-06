import test from 'node:test';
import assert from 'node:assert/strict';
import {ticketCsv} from '../frontend/ticket-export.js';
test('CSV escapes text, blocks spreadsheet formulas and includes timestamps',()=>{const csv=ticketCsv([{number:12,requirements:'=SUM(1,2)',description:'He said "yes"\nnext line',employee:'a',assigned_to:'b',created:'2026-10-06T10:00:00Z',status:'Open'}],[{id:'a',name:'Creator'},{id:'b',name:'Assignee'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('He said ""yes""'));assert.ok(csv.includes('Creator'));assert.ok(csv.includes('Last action (IST)'));});
