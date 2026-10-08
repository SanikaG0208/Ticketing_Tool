import {ticketEmail} from './ticket-email.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const allowed=/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)||origin===Deno.env.get('APP_ORIGIN')||origin==='https://ticketing-tool-rv8h.vercel.app'||origin==='https://ticketing-tool.b2bindemand.agency';
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed?origin:'null',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply=(status:number,data:object)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
  const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return reply(401,{error:'Sign in required'});
  const client=createClient(url,publicKey,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const auth=await client.auth.getUser(token);
  if(auth.error||!auth.data.user)return reply(401,{error:'Invalid or expired session'});
  const user=auth.data.user;
  const profile=await admin.from('profiles').select('id,active,role,departments(name)').eq('id',user.id).maybeSingle();
  if(profile.error||!profile.data?.active)return reply(403,{error:'Active employee access required'});
  const isAdmin=profile.data.role==='admin';
  try {
    const body=await req.json();
    if(body.action==='ticket_update_email') {
      if(typeof body.ticket_id!=='string'||!/^[-0-9a-f]{36}$/i.test(body.ticket_id))return reply(422,{error:'Invalid ticket'});
      const event=await admin.from('ticket_activity').select('id,ticket_id,actor_id,actor_name,action').eq('ticket_id',body.ticket_id).eq('actor_id',user.id).order('id',{ascending:false}).limit(1).single();
      if(event.error||event.data.actor_id!==user.id)return reply(403,{error:'Update notification not permitted'});
      const queue=await admin.from('ticket_notifications').select('id,recipient_id,email_status').eq('event_id',event.data.id);
      if(queue.error)return reply(503,{error:'Unable to load notifications'});
      const people=await admin.from('profiles').select('id,email,active').in('id',queue.data.map(n=>n.recipient_id));
      if(people.error)return reply(503,{error:'Unable to load recipients'});
      const link=new URL(Deno.env.get('APP_LOGIN_URL')||'https://ticketing-tool-rv8h.vercel.app');link.searchParams.set('ticket',event.data.ticket_id);link.hash='/tickets';
      const text=event.data.actor_name+' added an update to your ticket.\n\nView the update and reply inside the ticket: '+link.href+'\n\nPlease keep all issue-related communication in the ticket.';
      const safe=link.href.replaceAll('&','&amp;').replaceAll('"','&quot;');
      const results=await Promise.all(queue.data.map(async n=>{
        if(n.email_status==='sent')return 'sent';const person=people.data.find(p=>p.id===n.recipient_id&&p.active);if(!person)return 'failed';
        const state=await sendMail(person.email,'Ticket update · B2B InDemand',text,'<h2>Your ticket has an update</h2><p>View the update and reply inside the ticket.</p><p><a href="'+safe+'">Open ticket</a></p><p>Keep all issue-related communication in this ticket.</p>','activity-'+event.data.id+'-'+n.recipient_id);
        await admin.from('ticket_notifications').update({email_status:state}).eq('id',n.id);return state;
      }));
      return reply(200,{email_status:results.every(s=>s==='sent')?'sent':results.every(s=>s==='not_configured')?'not_configured':'failed'});
    }
    if(body.action==='ticket_email') {
      const ticket=await client.from('tickets').select('*').eq('id',body.id).maybeSingle();
      if(ticket.error||!ticket.data||ticket.data.employee_id!==user.id)return reply(403,{error:'Ticket notification not permitted'});
      if(ticket.data.email_status!=='not_requested')return reply(200,{email_status:ticket.data.email_status});
      const people=await admin.from('profiles').select('id,name,email').in('id',[ticket.data.employee_id,ticket.data.assigned_to]);
      if(people.error)return reply(503,{error:'Unable to load ticket recipients'});
      const creator=people.data.find(p=>p.id===ticket.data.employee_id);
      const assignee=people.data.find(p=>p.id===ticket.data.assigned_to);
      if(!creator||!assignee)return reply(503,{error:'Ticket recipients not found'});
      const recipients=[...new Map([creator,assignee].map(p=>[p.email.toLowerCase(),p])).values()];
      const results=await Promise.all(recipients.map(async recipient=>{
        const message=ticketEmail(ticket.data,creator,assignee,recipient,Deno.env.get('APP_LOGIN_URL')||'https://ticketing-tool-rv8h.vercel.app');
        return sendMail(recipient.email,message.subject,message.text,message.html,`ticket-${ticket.data.id}-${recipient.id}`);
      }));
      const state=results.every(s=>s==='sent')?'sent':results.every(s=>s==='not_configured')?'not_configured':'failed';
      await admin.from('tickets').update({email_status:state}).eq('id',ticket.data.id);
      return reply(200,{email_status:state});
    }
    if(!isAdmin)return reply(403,{error:'Administrator access required'});
    if(body.action==='reset_password') {
      const employee=await admin.from('profiles').select('email').eq('id',body.id).maybeSingle();
      if(employee.error||!employee.data)return reply(404,{error:'Employee not found'});
      const redirectTo=new URL('/?page=reset-password',Deno.env.get('APP_LOGIN_URL')||'https://ticketing-tool-rv8h.vercel.app').href;
      const response=await admin.auth.resetPasswordForEmail(employee.data.email,{redirectTo});
      if(response.error)return reply(503,{error:'Could not send password reset email'});
      return reply(200,{requested:true});
    }
    if(body.action!=='create_employee')return reply(422,{error:'Invalid action'});
    if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||
      typeof body.password!=='string'||body.password.length<12||body.password.length>128||typeof body.department_id!=='string')return reply(422,{error:'Name, email, department and a password of at least 12 characters are required'});
    const dept=await admin.from('departments').select('id').eq('id',body.department_id).eq('active',true).maybeSingle();
    if(dept.error||!dept.data)return reply(422,{error:'Department not found'});
    const account=await admin.auth.admin.createUser({email:body.email.trim().toLowerCase(),password:body.password,email_confirm:true});
    if(account.error)return reply(409,{error:'Unable to create account. Check whether the email is already registered.'});
    const employee=await admin.from('profiles').insert({id:account.data.user.id,name:body.name.trim(),email:body.email.trim().toLowerCase(),department_id:body.department_id,is_poc:body.is_poc===true,role:body.is_admin===true?'admin':'employee'}).select().single();
    if(employee.error){await admin.auth.admin.deleteUser(account.data.user.id);return reply(503,{error:'Employee provisioning failed'});}
    const loginUrl=Deno.env.get('APP_LOGIN_URL')||'https://ticketing-tool-rv8h.vercel.app';
    const credential_email_status=await sendMail(body.email,'Your ticketing account',`Hello ${body.name},\n\nIT created your account.\nSign in: ${loginUrl}\nEmail: ${body.email}\nPassword: ${body.password}\n\nKeep these credentials private.`);
    return reply(201,{employee:employee.data,credential_email_status});
  }catch{return reply(500,{error:'Unable to process request'});}
});

async function sendMail(to:string,subject:string,text:string,html?:string,idempotencyKey?:string) {
  const apiKey=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('EMAIL_FROM');
  if(!apiKey||!from)return 'not_configured';
  try {
    const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from,to:[to],subject,text,...(html?{html}:{})}),signal:AbortSignal.timeout(10000)});
    return result.ok?'sent':'failed';
  }catch{return 'failed';}
}
