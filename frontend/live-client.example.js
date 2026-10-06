// Future integration example. This file is not imported by the demo UI.
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export async function signIn(email,password) {
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;
  return data;
}
export async function api(path, options={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Please sign in');
  const isForm=options.body instanceof FormData;
  const response=await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api${path}`,{
    ...options,headers:{...(!isForm?{'Content-Type':'application/json'}:{}),...options.headers,Authorization:`Bearer ${session.access_token}`}
  });
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||'Request failed');
  return body;
}
