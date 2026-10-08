import React,{useEffect,useState} from 'react';
import {supabase} from '../../supabase-service.js';
import {duration} from '../../TicketInsights.jsx';
export default function PocSlaSummary({ticket}){
 const [metrics,setMetrics]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let current=true;setMetrics(null);setError('');supabase.from('ticket_export').select('response_seconds,resolution_seconds,sla_status').eq('id',ticket.id).single().then(result=>{if(!current)return;if(result.error)setError('Unable to load SLA timings.');else setMetrics(result.data);});return()=>{current=false;};},[ticket.id,ticket.updated_at]);
 return <section className="poc-sla-summary"><h3>SLA & resolution time</h3>{error?<p role="alert">{error}</p>:!metrics?<p role="status">Loading timings…</p>:<dl><dt>Response time</dt><dd>{duration(metrics.response_seconds)}</dd><dt>Resolution time</dt><dd>{duration(metrics.resolution_seconds)}</dd><dt>SLA status</dt><dd>{metrics.sla_status}</dd></dl>}<p className="hint">Response and resolution targets must be configured before a ticket can be marked Within SLA or SLA Breached.</p></section>;
}
