import React from 'react';
import AdminDashboard from './AdminDashboard.jsx';
import AdminDowntime from './AdminDowntime.jsx';
import AdminSla from './AdminSla.jsx';
import AdminTeamPerformance from './AdminTeamPerformance.jsx';
import AdminReports from './AdminReports.jsx';
import AdminExport from './AdminExport.jsx';
export const adminPageNames={dashboard:'Dashboard',tickets:'All Tickets',downtime:'Downtime',sla:'SLA','team-performance':'Team Performance',reports:'Reports',export:'Export',users:'Employees',departments:'Departments'};
export default function AdminPage({page,data,onError,onTickets}){const views={dashboard:AdminDashboard,downtime:AdminDowntime,sla:AdminSla,'team-performance':AdminTeamPerformance,reports:AdminReports};if(page==='export')return <AdminExport data={data} onError={onError} onTickets={onTickets}/>;const View=views[page];return View?<View/>:null;}
