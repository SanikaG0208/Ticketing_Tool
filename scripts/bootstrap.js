import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { admin } from '../src/clients.js';

// Create the first user in Supabase Dashboard > Authentication > Users first.
// This CLI provisions that existing account as the first IT administrator.
const existing = await admin.from('profiles').select('id, departments!inner(name)').eq('departments.name','IT').limit(1);
if (existing.error) throw new Error('Run database/setup.sql first');
if (existing.data.length) throw new Error('An IT account already exists. Use the admin UI for new users.');
const prompt = createInterface({ input:stdin, output:stdout });
try {
  const id = (await prompt.question('Existing Supabase Auth user UUID: ')).trim();
  const name = (await prompt.question('Employee name: ')).trim();
  if (!name || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Valid Auth UUID and name required');
  const authUser = await admin.auth.admin.getUserById(id);
  if (authUser.error) throw new Error('Auth user not found');
  const dept = await admin.from('departments').select('id').eq('name','IT').single();
  if (dept.error) throw new Error('IT department not found');
  const profile = await admin.from('profiles').insert({ id,name,email:authUser.data.user.email,department_id:dept.data.id });
  if (profile.error) throw new Error('Could not provision profile');
  console.log('First IT administrator provisioned.');
} finally { prompt.close(); }
