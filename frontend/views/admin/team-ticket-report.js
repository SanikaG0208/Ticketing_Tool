export function teamTicketReport(tickets){
 const teams=new Map();
 for(const t of tickets){const id=t.department_id||'unknown';if(!teams.has(id))teams.set(id,{id,name:t.departments?.name||'Unknown department',total:0,open:0,progress:0,waiting:0,resolved:0,closed:0,reassignment:0});const row=teams.get(id);row.total++;const key={Open:'open','In Progress':'progress',Waiting:'waiting',Resolved:'resolved',Completed:'closed',Closed:'closed'}[t.status];if(key)row[key]++;if(t.needs_reassignment)row.reassignment++;}
 return [...teams.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}
