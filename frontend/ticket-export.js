function cell(value) {
 let text=String(value??'');
 // Prevent spreadsheet applications from treating user-entered text as formulas.
 if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
function date(value) {return value?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'long',timeZone:'Asia/Kolkata'}).format(new Date(value)):'';}
export function ticketCsv(tickets,users) {
 const name=id=>users.find(u=>u.id===id)?.name||'';
 const email=id=>users.find(u=>u.id===id)?.email||'';
 const rows=[['Ticket number','Requirements','Description','Department','Type','Subtype','Raised by','Creator email','Assigned to','Assignee email','Priority','Status','Created (IST)','Last action (IST)','Completed (IST)'],...tickets.map(t=>[t.number,t.requirements,t.description,t.department,t.type,t.subtype,name(t.employee),email(t.employee),name(t.assigned_to),email(t.assigned_to),t.priority,t.status,date(t.created),date(t.last_action_at),t.status==='Completed'?date(t.completed_at):''])];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadTickets(tickets,users) {
 const url=URL.createObjectURL(new Blob([ticketCsv(tickets,users)],{type:'text/csv;charset=utf-8;'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=`tickets-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
