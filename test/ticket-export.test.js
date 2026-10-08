import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {ticketWorkbook} from '../frontend/ticket-workbook.js';
import {exportDateBounds,fetchExportTicketsWithClient} from '../frontend/ticket-export-query.js';

test('Excel round trip preserves safe text, ticket IDs, IST dates, numeric durations and missing milestones',async()=>{
 const wb=await ticketWorkbook([{number:1,employee:'=HYPERLINK("https://example.com")',description:'Line one\nLine two',created_at:'2026-10-08T00:00:00Z',response_seconds:3600,resolution_seconds:7200,sla_status:'Not configured'}]);
 const read=new ExcelJS.Workbook();await read.xlsx.load(await wb.xlsx.writeBuffer());const sheet=read.getWorksheet('Tickets');
 assert.equal(sheet.columnCount,23);assert.equal(sheet.getCell('A2').value,'TKT01');assert.equal(sheet.getCell('B2').type,ExcelJS.ValueType.String);assert.equal(sheet.getCell('E2').value,'Line one\nLine two');
 assert.equal(sheet.getCell('K2').value.toISOString(),'2026-10-08T05:30:00.000Z');assert.equal(sheet.getCell('Q2').value,1);assert.equal(sheet.getCell('R2').value,2);assert.equal(sheet.getCell('N2').value,null);assert.equal(sheet.getCell('U2').value,null);assert.equal(sheet.views[0].ySplit,1);assert.ok(read.getWorksheet('Export details'));
});
test('Created date filters include the entire IST day and reject reversed dates',()=>{
 assert.deepEqual(exportDateBounds('2026-10-08','2026-10-08'),{from:'2026-10-07T18:30:00.000Z',to:'2026-10-08T18:30:00.000Z'});
 assert.throws(()=>exportDateBounds('2026-10-09','2026-10-08'),/End date/);
});
function fakeClient(rows){return {from(){let data=[...rows];const q={select(){return q;},order(){data.sort((a,b)=>b.number-a.number);return q;},limit(n){q.max=n;return q;},eq(k,v){data=data.filter(r=>r[k]===v);return q;},gte(k,v){data=data.filter(r=>r[k]>=v);return q;},lt(k,v){data=data.filter(r=>r[k]<v);return q;},lte(k,v){data=data.filter(r=>r[k]<=v);return q;},in(k,values){data=data.filter(r=>values.includes(r[k]));return q;},then(resolve){return Promise.resolve({data:data.slice(0,q.max),error:null}).then(resolve);}};return q;}};}
test('Export All fetches beyond the first page and applies department/status filters',async()=>{
 const rows=Array.from({length:450},(_,i)=>({id:i+1,number:i+1,department_id:'IT',status:'Open'}));rows.push({id:451,number:451,department_id:'HR',status:'Open'});
 const result=await fetchExportTicketsWithClient(fakeClient(rows),{department:'IT',status:'Open'});assert.equal(result.length,450);assert.equal(new Set(result.map(r=>r.id)).size,450);assert.equal(result[0].number,450);assert.equal(result.at(-1).number,1);
});
test('Selected export only includes selected tickets across batch boundaries',async()=>{
 const rows=Array.from({length:250},(_,i)=>({id:i+1,number:i+1}));const result=await fetchExportTicketsWithClient(fakeClient(rows),{},rows.slice(0,205).map(r=>r.id));assert.equal(result.length,205);assert.equal(result[0].number,205);assert.equal(result.at(-1).number,1);
});
