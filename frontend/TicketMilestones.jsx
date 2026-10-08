import React,{useEffect,useState} from 'react';
import {supabase} from './supabase-service.js';
import {exactTime} from './TicketTimeline.jsx';
import {duration} from './TicketInsights.jsx';
export default function TicketMilestones({ticket}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData(null);setError('');supabase.from('ticket_milestones').select('*').eq('ticket_id',ticket.id).single().then(r=>{if(active){if(r.error)setError('Unable to load ticket milestones.');else setData(r.data);}});return()=>{active=false;};},[ticket.id,ticket.updated_at]);
 return <section><h3>Ticket milestones</h3>{error?<p role="alert">{error}</p>:!data?<p>Loading milestones…</p>:<><dl>{[['Issue Started',data.issue_started_at],['Ticket Created',data.created_at],['Assigned',data.assigned_at],['Work Started',data.work_started_at],['Escalated',data.escalated_at],['Resolved',data.resolved_at],['Closed / Completed',data.completed_at]].map(([label,time])=><React.Fragment key={label}><dt>{label}</dt><dd>{time?exactTime(time):'—'}</dd></React.Fragment>)}</dl><p className="hint">Milestones show the first recorded action. Escalated records the first reassignment with a reason.</p><dl>{[['Response time',data.response_seconds],['Resolution time',data.resolution_seconds],['Employee downtime',data.employee_downtime_seconds]].map(([label,value])=><React.Fragment key={label}><dt>{label}</dt><dd>{duration(value)}</dd></React.Fragment>)}</dl><p className="hint">Employee downtime runs from issue start to first resolution when work blockage is reported; ongoing issues continue accumulating.</p></>}</section>;
}
