import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const allowed=/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)||origin===Deno.env.get('APP_ORIGIN');
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
  const profile=await admin.from('profiles').select('id,active,departments(name)').eq('id',user.id).maybeSingle();
  if(profile.error||!profile.data?.active)return reply(403,{error:'Active employee access required'});
  const isIT=(profile.data.departments as unknown as {name:string}).name==='IT';
  try {
    const body=await req.json();
    if(body.action==='ticket_email') {
      const ticket=await client.from('tickets').select('*').eq('id',body.id).maybeSingle();
      if(ticket.error||!ticket.data||ticket.data.employee_id!==user.id||!ticket.data.send_email)return reply(403,{error:'Ticket notification not permitted'});
      if(ticket.data.email_status!=='not_requested')return reply(200,{email_status:ticket.data.email_status});
      const state=await sendMail(user.email!,`Ticket #${ticket.data.number} received`,`Your ticket #${ticket.data.number} was created. Sign in to follow its progress.`);
      await admin.from('tickets').update({email_status:state}).eq('id',ticket.data.id);
      return reply(200,{email_status:state});
    }
    if(!isIT)return reply(403,{error:'IT administrator access required'});
    if(body.action==='reset_password') {
      const employee=await admin.from('profiles').select('email').eq('id',body.id).maybeSingle();
      if(employee.error||!employee.data)return reply(404,{error:'Employee not found'});
      const redirectTo=new URL('/?page=reset-password',Deno.env.get('APP_LOGIN_URL')||'http://localhost:5173').href;
      const response=await admin.auth.resetPasswordForEmail(employee.data.email,{redirectTo});
      if(response.error)return reply(503,{error:'Could not send password reset email'});
      return reply(200,{requested:true});
    }
    if(body.action!=='create_employee')return reply(422,{error:'Invalid action'});
    if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||
      typeof body.password!=='string'||body.password.length<12||body.password.length>128||typeof body.department_id!=='string')return reply(422,{error:'Name, email, department and a password of at least 12 characters are required'});
    const dept=await admin.from('departments').select('id').eq('id',body.department_id).maybeSingle();
    if(dept.error||!dept.data)return reply(422,{error:'Department not found'});
    const account=await admin.auth.admin.createUser({email:body.email.trim().toLowerCase(),password:body.password,email_confirm:true});
    if(account.error)return reply(409,{error:'Unable to create account. Check whether the email is already registered.'});
    const employee=await admin.from('profiles').insert({id:account.data.user.id,name:body.name.trim(),email:body.email.trim().toLowerCase(),department_id:body.department_id}).select().single();
    if(employee.error){await admin.auth.admin.deleteUser(account.data.user.id);return reply(503,{error:'Employee provisioning failed'});}
    const loginUrl=Deno.env.get('APP_LOGIN_URL')||'http://localhost:5173';
    const credential_email_status=await sendMail(body.email,'Your ticketing account',`Hello ${body.name},\n\nIT created your account.\nSign in: ${loginUrl}\nEmail: ${body.email}\nPassword: ${body.password}\n\nKeep these credentials private.`);
    return reply(201,{employee:employee.data,credential_email_status});
  }catch{return reply(500,{error:'Unable to process request'});}
});

async function sendMail(to:string,subject:string,text:string) {
  const apiKey=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('EMAIL_FROM');
  if(!apiKey||!from)return 'not_configured';
  try {
    const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,text}),signal:AbortSignal.timeout(10000)});
    return result.ok?'sent':'failed';
  }catch{return 'failed';}
}
