import {activityKey} from './idle-session.js';
import React from 'react';
import {signInEmployee,fetchWorkspace} from '../supabase-service.js';
export default function LoginPage({error,setError,signingIn,setSigningIn,showLoginPassword,setShowLoginPassword,setData,setUser,setPageState}){return <div className="login">
    <div className="login-art">
      <a className="brand">
        <b>▧</b>
        desk
        <span> / support</span>
      </a>
      <div>
        <span className="eyebrow">YOUR ORGANIZATION. CONNECTED.</span>
        <h1>Ticketing Tool</h1>
        
      </div>
      <small>Organization service desk</small>
    </div>
    <main className="login-form">
      <div className="demo-label">
        SECURE EMPLOYEE SIGN-IN
      </div>
      <h2>Sign in</h2>
      
      {error && <div className="error" role="alert">{error}
      </div>}
      <form onSubmit={async e => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        setSigningIn(true);
        setError('');
        try {
          const employee = await signInEmployee(String(values.get('email')), String(values.get('password')));
          const workspace = await fetchWorkspace();
          try{localStorage.setItem(activityKey(employee.id),String(Date.now()));}catch{}
          setData(workspace); setUser(employee);
          setShowLoginPassword(false);
          setPageState('tickets');
          window.location.hash = '/tickets';
        } catch {
          setError('Unable to sign in. Check your credentials and employee access.');

        } finally {
          setSigningIn(false);

        }
      }
      }>
        <label>Email address<input name="email" type="email" required autoComplete="username" placeholder="you@organization.com" /></label><div className="login-password-group"><label htmlFor="login-password">Password</label><div className="login-password-control"><input id="login-password" name="password" type={showLoginPassword ? 'text' : 'password'} required maxLength={128} autoComplete="current-password" placeholder="Enter your password" /><button type="button" className="password-eye" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} aria-pressed={showLoginPassword} title={showLoginPassword ? 'Hide password' : 'Show password'} onClick={() => setShowLoginPassword(value => !value)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showLoginPassword && <path d="M3 3l18 18" />}</svg></button></div></div><button className="primary" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'} <span>→</span></button></form><p><a className="text-button" href="/?page=forgot-password">Forgot password?</a></p></main></div>;}
