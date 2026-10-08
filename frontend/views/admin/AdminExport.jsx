import React from 'react';
import TicketExportControls from '../../TicketExportControls.jsx';
export default function AdminExport({data,onError,onTickets}){return <section className="panel"><button className="secondary" style={{margin:18}} onClick={onTickets}>Select tickets</button><TicketExportControls selectedIds={[]} departments={data.departmentOptions} users={data.users} onError={onError}/></section>;}
