import React,{useEffect,useState} from 'react';
import {supabase} from './supabase-service.js';
export default function TicketSnapshot({snapshot}) {
 const [url,setUrl]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;async function load(){try{const result=await supabase.storage.from('ticket-snapshots').createSignedUrl(snapshot.storage_path,3600);if(result.error)throw result.error;if(active)setUrl(result.data.signedUrl);}catch{if(active)setError('Unable to load screenshot. Close and reopen this ticket to retry.');}}load();return()=>{active=false;};},[snapshot.storage_path]);
 if(error)return <p role="alert">{error}</p>;
 if(!url)return <p role="status">Loading screenshot…</p>;
 return <a href={url} download={snapshot.name}><img className="snapshot" src={url} alt="Attached screenshot"/>Download screenshot</a>;
}
