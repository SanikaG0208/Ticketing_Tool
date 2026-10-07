import test from 'node:test';
import assert from 'node:assert/strict';
import {issueStartUtc} from '../frontend/issue-start.js';
test('issue start is optional and converts explicit IST to UTC',()=>{assert.equal(issueStartUtc(''),null);assert.equal(issueStartUtc('2026-10-06T09:30',Date.parse('2026-10-07T00:00Z')),'2026-10-06T04:00:00.000Z');});
test('future and malformed issue start dates are rejected',()=>{assert.throws(()=>issueStartUtc('2026-10-08T09:30',Date.parse('2026-10-07T00:00Z')));assert.throws(()=>issueStartUtc('invalid'));});
