import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '../supabase-service.js';
import {idleState,activityKey,readActivity} from './idle-session.js';
export default function IdleSession({user,onExpired}) {
 const [remaining,setRemaining]=useState(null),expired=useRef(false),last=useRef(0);
 useEffect(()=>{
  expired.current=false;const key=activityKey(user.id);last.current=readActivity(localStorage,user.id);
  const write=()=>{try{localStorage.setItem(key,String(last.current));}catch{}};
  write();
  async function check(){if(expired.current)return;last.current=Math.max(last.current,readActivity(localStorage,user.id));const state=idleState(last.current);setRemaining(state.warning?Math.ceil(state.remaining/1000):null);if(state.expired){expired.current=true;onExpired();try{await supabase.auth.signOut({scope:'local'});}catch{ /* Expired UI stays locked until a fresh sign-in. */ }}}
  const activity=e=>{if(!e.isTrusted||document.visibilityState!=='visible'||expired.current)return;if(idleState(last.current).expired){check();return;}last.current=Date.now();write();setRemaining(null);};
  const sync=e=>{if(e.key===key)check();};
  const wake=()=>check();
  const events=['pointerdown','keydown','input','wheel','touchstart'];events.forEach(e=>window.addEventListener(e,activity,{passive:true}));window.addEventListener('storage',sync);document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);
  const timer=setInterval(check,1000);check();
  return()=>{clearInterval(timer);events.forEach(e=>window.removeEventListener(e,activity));window.removeEventListener('storage',sync);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);};
 },[user.id]);
 function stay(){if(expired.current||idleState(last.current).expired)return;last.current=Date.now();try{localStorage.setItem(activityKey(user.id),String(last.current));}catch{}setRemaining(null);}
 return remaining===null?null:<div className="idle-warning" role="alertdialog" aria-label="Session expiring"><strong>Session expiring in {remaining}s</strong><p>You’ve been inactive for nearly 30 minutes.</p><button type="button" className="primary" onClick={stay}>Stay signed in</button></div>;
}
