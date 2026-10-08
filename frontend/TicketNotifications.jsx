import React,{useState,useEffect} from 'react';
import {supabase} from './supabase-service.js';
import {exactTime} from './TicketTimeline.jsx';
export default function TicketNotifications({onOpen,onUnread}){
 const [items,setItems]=useState([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;async function load(){const r=await supabase.from('ticket_notifications').select('id,ticket_id,created_at,tickets(number)').is('read_at',null).order('created_at',{ascending:false}).limit(100);if(!active)return;if(r.error){setError('Unable to load ticket notifications.');return;}setError('');setItems(r.data);onUnread([...new Set(r.data.map(n=>n.ticket_id))]);}load();const interval=setInterval(load,30000);window.addEventListener('ticket-notifications-changed',load);return()=>{active=false;clearInterval(interval);window.removeEventListener('ticket-notifications-changed',load);};},[]);
 if(!items.length&&!error)return null;
 return <section className="panel" style={{padding:16,marginBottom:20}}><strong>Ticket updates · {items.length}{items.length===100?'+':''} unread</strong>{error&&<p role="alert">{error}</p>}{!items.length&&!error&&<p className="hint">You are up to date. New comments, status changes, and reassignment appear here.</p>}{items.slice(0,10).map(n=><div key={n.id} style={{marginTop:8}}><button type="button" className="text-button" onClick={()=>onOpen(n.ticket_id)}>Open {n.tickets?'TKT'+String(n.tickets.number).padStart(2,'0'):'ticket'} update</button><small> · {exactTime(n.created_at)}</small></div>)}</section>;
}
