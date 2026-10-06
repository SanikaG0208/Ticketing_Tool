import React, { useEffect, useState } from 'react';
import { supabase } from './supabase-service.js';
import { resetPasswordUrl, verifyRecovery, saveRecoveredPassword } from './password-recovery.js';

const inputUrl = new URL(window.location.href);
const tokenHash = inputUrl.searchParams.get('token_hash');
let recoveryVerification;
function PasswordField({ name, label }) {
  const [visible, setVisible] = useState(false);
  return <label>{label}<div className="login-password-control"><input name={name} type={visible ? 'text' : 'password'} required minLength={12} maxLength={128} autoComplete="new-password"/><button type="button" className="password-eye" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="M3 3l18 18"/>}</svg></button></div></label>;
}
export default function PasswordRecovery({ reset, recoverySession }) {
  const [busy,setBusy]=useState(reset), [error,setError]=useState(''), [sent,setSent]=useState(false), [saved,setSaved]=useState(false), [userId,setUserId]=useState(null);
  useEffect(() => {
    if (!reset) return;
    let mounted=true;
    async function verify() {
      try {
        let id;
        if(tokenHash) { recoveryVerification ||= verifyRecovery(supabase.auth,tokenHash); id=await recoveryVerification; }
        else if(recoverySession) { const result=await supabase.auth.getUser(); if(result.error||!result.data.user)throw new Error('Your reset session expired. Request a new link.'); id=result.data.user.id; }
        else throw new Error('Open the reset link from your email, or request a new link.');
        if(mounted){setUserId(id);window.history.replaceState(null,'','/?page=reset-password');}
      } catch(e){if(mounted)setError(e.message);} finally{if(mounted)setBusy(false);}
    }
    verify();return()=>{mounted=false;};
  },[reset,recoverySession]);
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');const values=new FormData(e.currentTarget);
    try {
      if(reset) { await saveRecoveredPassword(supabase.auth,userId,String(values.get('password')),String(values.get('confirmation')));setSaved(true); }
      else { const result=await supabase.auth.resetPasswordForEmail(String(values.get('email')).trim(),{redirectTo:resetPasswordUrl(window.location.origin)});if(result.error)throw new Error(result.error.message);setSent(true); }
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="login"><div className="login-art"><a className="brand"><b>▧</b> desk<span> / support</span></a><div><span className="eyebrow">ORGANIZATION SERVICE DESK</span><h1>Back to your desk.<br/>Securely.</h1><p>Reset your password and get back to your requests.</p></div><small>Organization service desk</small></div><main className="login-form"><div className="demo-label">ACCOUNT RECOVERY</div><h2>{saved?'Password updated.':reset?'Choose a new password.':'Forgot your password?'}</h2><p>{saved?'Your new password is saved. Sign in with your employee email and new password.':reset?'Enter and confirm your new password. Use at least 12 characters.':'Enter your employee email and we’ll send you a reset link.'}</p>{error&&<p className="error" role="alert">{error}</p>}{sent?<p className="notice" role="status">If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder.</p>:saved?null:reset&&!userId?<p role="status">{busy?'Verifying your reset link…':<a href="/?page=forgot-password">Request a new reset link</a>}</p>:<form onSubmit={submit}>{reset?<><PasswordField name="password" label="New password"/><PasswordField name="confirmation" label="Confirm new password"/></>:<label>Email address<input name="email" type="email" required autoComplete="email" placeholder="you@organization.com"/></label>}<button className="primary" disabled={busy}>{busy?'Please wait…':reset?'Save new password':'Send reset email'}</button></form>}<p><a className="text-button" href="/#/login">Back to sign in</a></p></main></div>;
}
