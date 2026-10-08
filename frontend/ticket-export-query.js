export function exportDateBounds(from,to){if(from&&to&&from>to)throw new Error('End date must be on or after start date.');return {from:from?new Date(from+'T00:00:00+05:30').toISOString():null,to:to?new Date(new Date(to+'T00:00:00+05:30').getTime()+86400000).toISOString():null};}
export async function fetchExportTicketsWithClient(client,filters={},selectedIds=null,progress=()=>{}){
 const result=[];const bounds=exportDateBounds(filters.from,filters.to);let before=null;let high=null;
 const apply=q=>{if(bounds.from)q=q.gte('created_at',bounds.from);if(bounds.to)q=q.lt('created_at',bounds.to);for(const [key,value] of Object.entries({department_id:filters.department,assigned_team:filters.team,status:filters.status,issue:filters.issue,assigned_to:filters.poc,sla_status:filters.sla}))if(value)q=q.eq(key,value);return q;};
 if(selectedIds){for(let i=0;i<selectedIds.length;i+=100){const r=await client.from('ticket_export').select('*').in('id',selectedIds.slice(i,i+100)).order('number',{ascending:false});if(r.error)throw r.error;result.push(...r.data);progress(result.length);}return result.sort((a,b)=>b.number-a.number);}
 for(;;){let q=apply(client.from('ticket_export').select('*').order('number',{ascending:false}).limit(200));if(before!==null)q=q.lt('number',before);if(high!==null)q=q.lte('number',high);const r=await q;if(r.error)throw r.error;if(!r.data.length)break;if(high===null)high=r.data[0].number;result.push(...r.data);progress(result.length);if(r.data.length<200)break;before=r.data.at(-1).number;}
 return result;
}
