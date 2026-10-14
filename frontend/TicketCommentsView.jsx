import React,{useEffect,useState} from 'react';
import {supabase} from './supabase-service.js';
import TicketSnapshot from './TicketSnapshot.jsx';
import {exactTime} from './TicketTimeline.jsx';
export default function TicketCommentsView({ticket,users}){
 const [comments,setComments]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');supabase.from('ticket_comments').select('*').eq('ticket_id',ticket.id).order('created_at',{ascending:false}).limit(50).then(result=>{if(!active)return;if(result.error)setError('Unable to load comments.');else setComments(result.data.reverse());setLoading(false);});return()=>{active=false;};},[ticket.id]);
 return <section><h3>Comments & attachments</h3>{loading?<p role="status">Loading comments…</p>:error?<p role="alert">{error}</p>:comments.length?comments.map(c=><article className="ticket-comment" key={c.id}><strong>{users.find(u=>u.id===c.author_id)?.name||'Employee'}</strong><small> · {exactTime(c.created_at)}</small><p style={{whiteSpace:'pre-wrap'}}>{c.body}</p>{c.snapshot_path&&<TicketSnapshot snapshot={{storage_path:c.snapshot_path,name:c.snapshot_name}}/>}</article>):<p>No comments yet.</p>}</section>;
}
