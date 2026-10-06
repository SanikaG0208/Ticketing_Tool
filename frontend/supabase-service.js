import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
function checked(result) {
  if(result.error) throw new Error(result.error.code==='PGRST116'?'This ticket changed since you opened it. Refresh the page and try again.':result.error.message);
  return result.data;
}
export async function verifiedEmployee() {
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)return null;
  const profile=checked(await supabase.from('profiles').select('*, departments(name)').eq('id',data.user.id).maybeSingle());
  if(!profile?.active)throw new Error('Your employee account is inactive or has not been provisioned by IT.');
  return {id:profile.id,name:profile.name,email:data.user.email,department:profile.departments.name};
}
export async function signInEmployee(email,password) {
  const response=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(response.error)throw new Error('Invalid email or password.');
  const employee=await verifiedEmployee();
  if(!employee){await supabase.auth.signOut();throw new Error('Employee access is required.');}
  return employee;
}
export async function fetchWorkspace(limit = 50, before = null) {
  let ticketQuery=supabase.from('tickets').select('*,ticket_snapshots(*)').order('number',{ascending:false}).limit(limit+1);
  if(before!==null)ticketQuery=ticketQuery.lt('number',before);
  const [departments,profiles,types,subtypes,tickets]=await Promise.all([
    supabase.from('departments').select('id,name'),
    supabase.from('profiles').select('id,name,email,department_id,active'),
    supabase.from('ticket_types').select('id,name,department_id'),
    supabase.from('ticket_subtypes').select('id,name,type_id'),
    ticketQuery
  ]).then(results=>results.map(checked));
  const departmentName=id=>departments.find(d=>d.id===id)?.name;
  return {
    hasMore:tickets.length>limit,
    departments:departments.map(d=>d.name).sort(),
    users:profiles.map(p=>({id:p.id,name:p.name,email:p.email,department:departmentName(p.department_id),active:p.active})),
    types:types.map(t=>({id:t.id,name:t.name,department:departmentName(t.department_id),subtypes:subtypes.filter(s=>s.type_id===t.id).map(s=>s.name)})),
    tickets:tickets.slice(0,limit).map(t=>{
      const attachment=t.ticket_snapshots?.[0];
      return {...t,employee:t.employee_id,department:departmentName(t.department_id),type:types.find(ty=>ty.id===t.type_id)?.name,
        subtype:subtypes.find(s=>s.id===t.subtype_id)?.name,created:t.created_at,
        snapshot:attachment?{id:attachment.id,name:attachment.file_name,storage_path:attachment.storage_path}:null};
    })
  };
}
export async function createEmployee(body) {
  const data=checked(await supabase.functions.invoke('ticketing-admin',{body}));
  if(data.error)throw new Error(data.error);
  return data;
}
export async function resetEmployeePassword(id) {
  const data=checked(await supabase.functions.invoke('ticketing-admin',{body:{action:'reset_password',id}}));
  if(data.error)throw new Error(data.error);
  return data;
}
export async function commitWorkspace(previous,next,user) {
  const departments=checked(await supabase.from('departments').select('*'));
  const deptId=name=>departments.find(d=>d.name===name)?.id;
  const createdDepartments=next.departments.filter(name=>!previous.departments.includes(name));
  for(const name of createdDepartments)departments.push(checked(await supabase.from('departments').insert({name}).select().single()));
  // Employee accounts are created separately through the IT-only Edge Function.
  for(const type of next.types) {
    const old=previous.types.find(t=>t.department===type.department&&t.name===type.name);
    if(!old)checked(await supabase.from('ticket_types').insert({name:type.name,department_id:deptId(type.department)}));
    else for(const name of type.subtypes.filter(s=>!old.subtypes.includes(s)))checked(await supabase.from('ticket_subtypes').insert({name,type_id:old.id}));
  }
  const types=checked(await supabase.from('ticket_types').select('*'));
  const subtypes=checked(await supabase.from('ticket_subtypes').select('*'));
  for(const ticket of next.tickets) {
    const old=previous.tickets.find(t=>t.id===ticket.id);
    if(old && JSON.stringify(old)===JSON.stringify(ticket))continue;
    const department_id=deptId(ticket.department);
    const type_id=types.find(t=>t.name===ticket.type&&t.department_id===department_id)?.id;
    const subtype_id=subtypes.find(s=>s.name===ticket.subtype&&s.type_id===type_id)?.id;
    const fields={department_id,type_id,subtype_id,assigned_to:ticket.assigned_to,requirements:ticket.requirements,description:ticket.description,
      priority:ticket.priority,send_email:ticket.send_email};
    if(old)checked(await supabase.from('tickets').update({...fields,...(ticket.status!==old.status?{status:ticket.status}:{})}).eq('id',old.id).eq('updated_at',old.updated_at).select('id').single());
    else {
      const row=checked(await supabase.from('tickets').insert({...fields,id:ticket.id,employee_id:user.id}).select().single());
      if(row.send_email)await supabase.functions.invoke('ticketing-admin',{body:{action:'ticket_email',id:row.id}});
    }
    if(ticket.snapshot?.url?.startsWith('data:image/')) {
      const blob=await (await fetch(ticket.snapshot.url)).blob();
      const path=`${ticket.id}/${crypto.randomUUID()}.${blob.type==='image/png'?'png':'jpg'}`;
      checked(await supabase.storage.from('ticket-snapshots').upload(path,blob,{contentType:blob.type}));
      checked(await supabase.from('ticket_snapshots').insert({ticket_id:ticket.id,storage_path:path,file_name:ticket.snapshot.name,content_type:blob.type}));
    }
    if(old?.snapshot && (!ticket.snapshot||ticket.snapshot.url?.startsWith('data:image/'))) {
      checked(await supabase.storage.from('ticket-snapshots').remove([old.snapshot.storage_path]));
      checked(await supabase.from('ticket_snapshots').delete().eq('id',old.snapshot.id));
    }
  }
  return fetchWorkspace(Math.max(50,next.tickets.length));
}
