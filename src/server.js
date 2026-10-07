import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { admin, userClient } from './clients.js';
import { createAuthenticate, requireIT, httpError } from './auth.js';
import { schemas, validate, validateId, screenshotType } from './validation.js';
import { ticketEmail } from './email.js';
import { sendEmployeeCredentials } from './onboarding.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', createAuthenticate(userClient));

function result({ data, error }) {
  if (error) {
    if (error.code === '23505') throw httpError(409, 'This value already exists');
    if (['23503','23514','22P02'].includes(error.code)) throw httpError(422, 'Invalid reference or field value');
    if (error.code === '42501') throw httpError(403, 'Permission denied');
    console.error('Database request failed:', error.code);
    throw httpError(503, 'Database request failed');
  }
  return data;
}

async function ticketFor(req) {
  validateId(req.params.id);
  const ticket = result(await req.db.from('tickets').select('*').eq('id', req.params.id).maybeSingle());
  if (!ticket) throw httpError(404, 'Ticket not found');
  return ticket;
}

app.get('/api/me', (req, res) => res.json({ ...req.profile, email: req.user.email, can_administer: req.profile.departments.name === 'IT' }));
app.get('/api/catalog', async (req, res) => {
  const tables = ['departments'];
  const data = await Promise.all(tables.map(table => req.db.from(table).select('*').order('name')));
  res.json(Object.fromEntries(tables.map((table, i) => [table, result(data[i])])));
});

app.get('/api/departments/:id/users', async (req,res)=>{validateId(req.params.id);res.json(result(await req.db.from('profiles').select('id,name,department_id').eq('department_id',req.params.id).eq('active',true).order('name')));});
app.use('/api/admin', requireIT);
app.get('/api/admin/users', async (req, res) => {
  const { page, limit } = validate(schemas.pagination, req.query);
  res.json(result(await req.db.from('profiles').select('*, departments(name)').order('name').range((page-1)*limit,page*limit-1)));
});
app.post('/api/admin/users', async (req, res) => {
  const body = validate(schemas.user, req.body);
  const dept = result(await req.db.from('departments').select('id').eq('id',body.department_id).maybeSingle());
  if (!dept) throw httpError(422, 'Invalid department');
  const { data, error } = await admin.auth.admin.createUser({ email:body.email, password:body.password, email_confirm:true });
  if (error) throw httpError(error.status === 422 ? 409 : 400, 'Unable to create account; check email and password');
  const profile = await admin.from('profiles').insert({ id:data.user.id, name:body.name, email:body.email, department_id:body.department_id }).select().single();
  if (profile.error) {
    const cleanup = await admin.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) console.error('Account cleanup required for Auth ID', data.user.id);
    result(profile);
  }
  const credential_email_status = await sendEmployeeCredentials(body);
  res.status(201).json({ ...profile.data, credential_email_status });
});
for (const [route, table, schema] of [
  ['departments','departments',schemas.name]
]) app.post(`/api/admin/${route}`, async (req, res) => {
  res.status(201).json(result(await req.db.from(table).insert(validate(schema,req.body)).select().single()));
});

app.get('/api/tickets', async (req, res) => {
  const { page, limit } = validate(schemas.pagination, req.query);
  const response = await req.db.from('tickets').select('*, employee:profiles(name), departments(name)',{ count:'exact' })
    .order('created_at',{ ascending:false }).range((page-1)*limit,page*limit-1);
  res.json({ items:result(response), total:response.count, page, limit });
});
app.post('/api/tickets', async (req, res) => {
  const body = validate(schemas.ticket,req.body);
  const ticket = result(await req.db.from('tickets').insert({ ...body, employee_id:req.user.id }).select().single());
  if (body.send_email) ticket.email_status = await ticketEmail(ticket,req.user.email);
  res.status(201).json(ticket);
});
app.get('/api/tickets/:id', async (req, res) => {
  const ticket = await ticketFor(req);
  const snapshots = result(await req.db.from('ticket_snapshots').select('id,file_name,content_type,created_at').eq('ticket_id',ticket.id));
  res.json({ ...ticket, snapshots });
});
app.put('/api/tickets/:id', async (req, res) => {
  await ticketFor(req);
  res.json(result(await req.db.from('tickets').update(validate(schemas.ticket,req.body)).eq('id',req.params.id).select().single()));
});
app.patch('/api/tickets/:id/status', requireIT, async (req,res) => {
  await ticketFor(req);
  res.json(result(await req.db.from('tickets').update(validate(schemas.status,req.body)).eq('id',req.params.id).select().single()));
});

const upload = multer({ storage:multer.memoryStorage(), limits:{ fileSize:5*1024*1024, files:1, fields:0 } });
app.post('/api/tickets/:id/snapshots', async (req,res,next) => { try { await ticketFor(req); next(); } catch(e) { next(e); } },
  upload.single('snapshot'), async (req,res) => {
    if (!req.file) throw httpError(422,'Attach a screenshot using the snapshot form field');
    const mime = screenshotType(req.file.buffer);
    if (!mime) throw httpError(422,'Only PNG and JPEG screenshots are accepted');
    const path = `${req.params.id}/${randomUUID()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    result(await req.db.storage.from('ticket-snapshots').upload(path,req.file.buffer,{ contentType:mime, upsert:false }));
    const row = await req.db.from('ticket_snapshots').insert({ ticket_id:req.params.id, storage_path:path,
      file_name:req.file.originalname.slice(0,255), content_type:mime }).select('id,file_name,content_type').single();
    if (row.error) {
      const cleanup = await admin.storage.from('ticket-snapshots').remove([path]);
      if (cleanup.error) console.error('Screenshot cleanup required for path',path);
      result(row);
    }
    res.status(201).json(row.data);
  });
app.get('/api/tickets/:id/snapshots/:snapshotId', async (req,res) => {
  await ticketFor(req);
  validateId(req.params.snapshotId);
  const snapshot = result(await req.db.from('ticket_snapshots').select('storage_path').eq('id',req.params.snapshotId).eq('ticket_id',req.params.id).maybeSingle());
  if (!snapshot) throw httpError(404,'Screenshot not found');
  res.json(result(await req.db.storage.from('ticket-snapshots').createSignedUrl(snapshot.storage_path,60,{ download:true })));
});
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 422).json({ error:'Attach one PNG/JPEG screenshot, maximum 5 MB' });
  const status = error.status || 500;
  if (status === 500) console.error('Unexpected request failure:',error.name);
  res.status(status).json({ error:status === 500 ? 'Internal server error' : error.message, ...(error.details ? { details:error.details } : {}) });
});
app.listen(Number(process.env.PORT || 4000),'127.0.0.1',() => console.log(`Ticketing API: http://localhost:${process.env.PORT || 4000}`));
