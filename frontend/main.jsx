import IdleSession from './auth/IdleSession.jsx';
import AdminNavigation from './views/admin/AdminNavigation.jsx';
import AdminPage,{adminPageNames} from './views/admin/AdminPage.jsx';
import PocSlaSummary from './views/poc/PocSlaSummary.jsx';
import TicketDetailsEditor from './features/tickets/TicketDetailsEditor.jsx';
import DirectoryCreateForm from './features/admin/DirectoryCreateForm.jsx';
import DepartmentEditForm from './features/admin/DepartmentEditForm.jsx';
import LoginPage from './auth/LoginPage.jsx';
import EmployeeEditForm from './features/admin/EmployeeEditForm.jsx';
import TicketForm from './features/tickets/TicketForm.jsx';
import {Icon,Badge,ticketNumber} from './features/ui.jsx';
import TicketsPage from './features/tickets/TicketsPage.jsx';
import EmployeeDirectory from './features/admin/EmployeeDirectory.jsx';
import DepartmentDirectory from './features/admin/DepartmentDirectory.jsx';
import AdminTicketView from './views/admin/AdminTicketView.jsx';
import PocTicketView from './views/poc/POCTicketView.jsx';
import EmployeeTicketView from './views/employee/EmployeeTicketView.jsx';
import {isAdmin,isPoc,canViewTicket,canManageTicket,canEditTicketDetails,workspaceRole} from './auth/permissions.js';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { validTicketRecipient } from './ticket-routing.js';
import { supabase, signInEmployee, verifiedEmployee, fetchWorkspace, commitWorkspace, createEmployee, resetEmployeePassword, fetchDepartmentUsers, fetchTicket } from './supabase-service.js';
import TicketTimeline, { exactTime } from './TicketTimeline.jsx';
import TicketExportControls from './TicketExportControls.jsx';
import TicketNotifications from './TicketNotifications.jsx';
import TicketMilestones from './TicketMilestones.jsx';
import TicketInsights from './TicketInsights.jsx';
import {issueStartUtc} from './issue-start.js';
import TicketSnapshot from './TicketSnapshot.jsx';
import TicketDiscussion from './TicketDiscussion.jsx';
import { workStatuses } from './ticket-workflow.js';
import PasswordRecovery from './PasswordRecovery.jsx';
import { protectedPage } from './route-access.js';



function App() {
  const [data, setData] = useState({ users: [], departments: [], tickets: [] }), [user, setUser] = useState(null), [page, setPageState] = useState('tickets'), [modal, setModal] = useState(null), [search, setSearch] = useState(''), [filter, setFilter] = useState('All tickets'), [notice, setNotice] = useState(''), [error, setError] = useState(''), [signingIn, setSigningIn] = useState(false), [showLoginPassword, setShowLoginPassword] = useState(false), [authLoading, setAuthLoading] = useState(true), [recovering, setRecovering] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [ticketScope,setTicketScope]=useState('all');
  useEffect(()=>{setTicketScope(isPoc(user)?'received':isAdmin(user)?'all':'raised');setSelectedTickets([]);},[user?.id,user?.role,user?.is_poc]);
  const [unreadTickets,setUnreadTickets]=useState([]);
  async function openTicket(id){try{setModal({kind:'view',ticket:await fetchTicket(id)});setError('');}catch(e){setError('Unable to open this ticket. You may no longer be assigned to it.');}}
  useEffect(()=>{if(!user)return;const params=new URLSearchParams(window.location.search);const id=params.get('ticket');if(id){params.delete('ticket');window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params:'')+window.location.hash);openTicket(id);}},[user]);
  const mutationLock = useRef(false), adminLock = useRef(false);
  async function deleteDirectoryItem(kind,id,name) {
    if(!admin||adminLock.current)return;
    if(!window.confirm('Delete '+name+' from active lists? Database records and ticket history will be retained.'))return;
    adminLock.current=true;setAdminSaving(true);setError('');
    try {const result=await supabase.rpc('deactivate_directory_item',{item_kind:kind,item_id:id});if(result.error)throw result.error;setData(await fetchWorkspace());setNotice(name+' removed from active lists.');}
    catch(e){setError(e.message||'Unable to delete.');}finally{adminLock.current=false;setAdminSaving(false);}
  }

  const [adminSaving, setAdminSaving] = useState(false);
  const [saving, setSaving] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  const [passwordPreviews, setPasswordPreviews] = useState({}), [visiblePasswords, setVisiblePasswords] = useState({});
  function previewPassword(employee) { return passwordPreviews[employee.id] || null; }
  const admin = isAdmin(user);
  const RoleTicketView=admin?AdminTicketView:isPoc(user)?PocTicketView:EmployeeTicketView;
  function setPage(requested) { const allowed = protectedPage(requested, user); setPageState(allowed === 'login' ? 'tickets' : allowed); window.location.hash = '/' + allowed; }
  async function save(next) { if (mutationLock.current) return false; mutationLock.current = true; setSaving(true); try { setData(await commitWorkspace(data, next, user)); setError(''); return true; } catch (e) { setError(e.message || 'Unable to save changes.'); return false; } finally { mutationLock.current = false; setSaving(false); } }
  function close() { if (mutationLock.current) return; setModal(null); setError(''); }
  const available = data.tickets.filter(t => canViewTicket(t,user)).filter(t=>ticketScope==='raised'?t.employee===user?.id:ticketScope==='received'?t.assigned_to===user?.id:ticketScope==='department'?t.department_id===user?.department_id&&t.employee!==user?.id&&t.assigned_to!==user?.id:true);
  const rows = available.filter(t => (filter === 'All tickets' || t.status === filter) && `${t.number} ${t.requirements} ${t.department}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    let mounted = true;
    async function restore() { try { const employee = await verifiedEmployee(); const workspace = employee ? await fetchWorkspace() : null; if (mounted) { setUser(employee); if (workspace) setData(workspace); } } catch (e) { if (mounted) { setUser(null); setError(e.message); } } finally { if (mounted) setAuthLoading(false); } }
    restore();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { setUser(null); setData({ users: [], departments: [], tickets: [] }); setPasswordPreviews({}); setVisiblePasswords({}); setRecovering(false); setModal(null); } if (event === 'PASSWORD_RECOVERY') setRecovering(true); if (event === 'TOKEN_REFRESHED') setTimeout(restore, 0); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (authLoading || ['forgot-password', 'reset-password'].includes(new URLSearchParams(window.location.search).get('page')) || recovering) return;
    function navigate() { const requested = window.location.hash.replace('#/', ''); const allowed = protectedPage(requested, user); setPageState(allowed === 'login' ? 'tickets' : allowed); if (requested !== allowed) window.location.hash = '/' + allowed; }
    navigate(); window.addEventListener('hashchange', navigate); return () => window.removeEventListener('hashchange', navigate);
  }, [user, authLoading, recovering]);

  async function requestPasswordReset(employee) { if (mutationLock.current) return; mutationLock.current = true; setSaving(true); try { await resetEmployeePassword(employee.id); setNotice('Password reset email requested for ' + employee.email); } catch (e) { setError(e.message); } finally { mutationLock.current = false; setSaving(false); } }
  const authPage = new URLSearchParams(window.location.search).get('page');
  if (authPage === 'forgot-password' || authPage === 'reset-password' || recovering) return <PasswordRecovery reset={authPage === 'reset-password' || recovering} recoverySession={recovering} />;
  if (authLoading) return <main className="login-form"><h2>Verifying your session…</h2></main>;


  if(!user)return <LoginPage {...{error,setError,signingIn,setSigningIn,showLoginPassword,setShowLoginPassword,setData,setUser,setPageState}}/>;
  return <div className="shell"><IdleSession user={user} onExpired={()=>{setUser(null);setModal(null);setData({users:[],departments:[],tickets:[]});setSelectedTickets([]);setPasswordPreviews({});setVisiblePasswords({});setError('You were signed out after 30 minutes of inactivity. Sign in to continue.');window.location.hash='/login';}}/><aside><a className="brand"><b>▧</b> desk<span> / support</span></a><>{admin?<AdminNavigation page={page} ticketCount={data.tickets.length} onNavigate={requested=>{setPage(requested);setSearch('');}}/>:<><p className="nav-label">WORKSPACE</p><button className={page==='tickets'?'nav active':'nav'} onClick={()=>setPage('tickets')}><Icon name="tickets"/>Tickets<span className="count">{available.length}</span></button></>}</><div className="side-bottom"><button className="account" onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) { setError('Unable to sign out. Please try again.'); return; } setUser(null); setPasswordPreviews({}); setVisiblePasswords({}); close(); setPage('tickets'); }}><span className="avatar">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><span><strong>{user.name}</strong><small>{user.department} · Sign out</small></span><span>↪</span></button></div></aside><div className="workspace"><header><span>Workspace <span className="slash">/</span> <strong>{admin?(adminPageNames[page]||'Dashboard'):'Tickets'}</strong></span><span className="demo-label">{workspaceRole(user)} WORKSPACE</span></header><main><div className="page-title"><div><h1>{admin&& !['tickets','users','departments'].includes(page)?adminPageNames[page]:page === 'tickets' ? (admin?'All tickets':isPoc(user)?'Support tickets':'My tickets') : page === 'users' ? 'Employees' : page === 'departments' ? 'Departments' : page === 'insights' ? 'Service insights' : 'Service desk'}</h1></div>{['tickets','users','departments'].includes(page) && <button className="primary" onClick={() => setModal({ kind: page === 'tickets' ? 'new' : page === 'users' ? 'user' : page === 'departments' ? 'department' : 'type' })}><Icon name="plus" />{page === 'tickets' ? 'New ticket' : page === 'users' ? 'New employee' : page === 'departments' ? 'Add department' : 'Add type'}</button>}</div>{notice && <div className="notice" role="status">✓ {notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}{error && <div className="error" role="alert">{error}</div>}
    {admin&&['dashboard','downtime','sla','team-performance','reports','export'].includes(page)?<AdminPage key={page} page={page} data={data} onError={setError} onTickets={()=>setPage('tickets')}/> : page === 'insights' ? <TicketInsights /> : page === 'tickets' ? <RoleTicketView scope={ticketScope} onScope={value=>{setTicketScope(value);setSelectedTickets([]);setFilter('All tickets');setSearch('');}}><TicketsPage {...{openTicket,setUnreadTickets,available,filter,setFilter,rows,selectedTickets,setSelectedTickets,search,setSearch,data,setError,setModal,user,isAdmin:admin,unreadTickets,loadingMore,setLoadingMore,setData}}/></RoleTicketView> : page === 'users' ? <EmployeeDirectory {...{data,user,isAdmin:admin,adminSaving,saving,setModal,requestPasswordReset,deleteDirectoryItem}}/> : page === 'departments' ? <DepartmentDirectory {...{data,isAdmin:admin,adminSaving,deleteDirectoryItem,setModal}}/> : null}</main></div>
    {modal && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-head"><div><span className="eyebrow">{modal.ticket ? ticketNumber(modal.ticket.number) : 'WORKSPACE'}</span><h2 id="dialog-title">{{ new: 'New ticket', edit: 'Update status & add comment', view: 'Ticket details', timeline: 'Ticket timeline', 'department-edit':'Edit department', 'employee-edit': 'Edit employee details', user: 'Add an employee', department: 'Add a department' }[modal.kind]}</h2></div><button className="close" onClick={close} aria-label="Close dialog">×</button></div>{error && <p className="error" role="alert">{error}</p>}{modal.kind === 'department-edit' ? <DepartmentEditForm department={modal.department} onCancel={close} onError={setError} onSave={async()=>{setData(await fetchWorkspace());setUser(await verifiedEmployee());close();setNotice('Department updated.');}}/> : modal.kind === 'employee-edit' ? <EmployeeEditForm employee={modal.employee} {...{admin,adminLock,setAdminSaving,setError,setData,setUser,user,close,setNotice,data,adminSaving}}/> : modal.kind === 'timeline' ? <><TicketMilestones ticket={modal.ticket}/><TicketTimeline key={modal.ticket.id} ticket={modal.ticket} users={data.users}/><div className="modal-foot"><button className="secondary" onClick={close}>Close</button></div></> : modal.kind === 'view' ? <><div className="detail-badges"><Badge value={modal.ticket.status} /><Badge value={modal.ticket.priority} /></div>{isPoc(user)&&modal.ticket.assigned_to===user.id&&<PocSlaSummary ticket={modal.ticket}/>}<h3>{modal.ticket.requirements}</h3><p className="description">{modal.ticket.description}</p><dl>{[['Issue started at',modal.ticket.issue_started_at?exactTime(modal.ticket.issue_started_at):'—'],['Ticket raised at', exactTime(modal.ticket.created)], ['Last updated', exactTime(modal.ticket.updated_at)], ['Raised by', data.users.find(u => u.id === modal.ticket.employee)?.name], ['Assigned to', data.users.find(u => u.id === modal.ticket.assigned_to)?.name || 'Not assigned'], ['Department', modal.ticket.department], ['Waiting reason',modal.ticket.status==='Waiting'?(modal.ticket.waiting_reason==='Other'?modal.ticket.waiting_other:'Waiting for '+modal.ticket.waiting_reason):'—'],['Issue',modal.ticket.issue||'—'],['Requested person/team',modal.ticket.poc_other||'—'], ['Email notification', modal.ticket.send_email ? 'Requested' : 'Not requested']].map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl>{modal.ticket.snapshot && <TicketSnapshot snapshot={modal.ticket.snapshot} />}<TicketDiscussion ticket={modal.ticket} user={user} users={data.users} onError={setError} onUpdate={async updated => { setData(previous => ({ ...previous, tickets: previous.tickets.map(t => t.id === updated.id ? updated : t) })); if(canViewTicket(updated,user))setModal(previous => previous?({ ...previous, ticket: updated }):null);else setModal(null); setError(''); setNotice('Ticket updated.'); }} /><div className="modal-foot"><button className="secondary" onClick={close}>Close</button>{!['Completed','Closed'].includes(modal.ticket.status) && (admin || modal.ticket.employee === user.id || modal.ticket.assigned_to === user.id) && <button className="primary" onClick={() => setModal({ ...modal, kind: 'edit' })}>Edit ticket</button>}</div></> : modal.kind === 'edit' ? <><>{canEditTicketDetails(modal.ticket,user)&&<TicketDetailsEditor key={modal.ticket.id} ticket={modal.ticket} data={data} onError={setError} onUpdate={async updated=>{setData(previous=>({...previous,tickets:previous.tickets.map(t=>t.id===updated.id?updated:t)}));setModal(previous=>({...previous,ticket:updated}));setError('');setNotice('Ticket details updated.');}}/>}</>{!canEditTicketDetails(modal.ticket,user)&&<fieldset disabled className="ticket-readonly-fields"><div className="form-grid">{[['Department', modal.ticket.department], ['Employee', data.users.find(u => u.id === modal.ticket.assigned_to)?.name], ['Issue', modal.ticket.issue || '—'], ['Requested person/team',modal.ticket.poc_other||'—']].map(([label, value]) => <label key={label}>{label}<input value={value || ''} readOnly /></label>)}</div><label>Requirements<input value={modal.ticket.requirements} readOnly /></label><label>{modal.ticket.issue==='Other'?'Describe the issue':'Description'}<textarea value={modal.ticket.description} readOnly rows={4} /></label><label>Priority<input value={modal.ticket.priority} readOnly /></label><label>Snapshot<input value={modal.ticket.snapshot?.name || 'No attachment'} readOnly /></label></fieldset>}<TicketDiscussion ticket={modal.ticket} user={user} users={data.users} onError={setError} onUpdate={async updated => { setData(previous => ({ ...previous, tickets: previous.tickets.map(t => t.id === updated.id ? updated : t) })); setModal(previous => ({ ...previous, ticket: updated })); setError(''); setNotice('Ticket status updated.'); }} /><div className="modal-foot"><button className="secondary" onClick={close}>Close</button></div></> : modal.kind === 'new' ? <TicketForm data={data} user={user} ticket={modal.ticket} onCancel={close} onError={setError} onSave={async ticket => { const next = { ...data, tickets: modal.kind === 'edit' ? data.tickets.map(t => t.id === ticket.id ? ticket : t) : [ticket, ...data.tickets] }; const saved=await save(next); if (saved) { close(); setNotice(modal.kind === 'edit' ? 'Ticket updated.' : 'Ticket created.'); } return saved; }} /> : <DirectoryCreateForm {...{admin,adminLock,adminSaving,setAdminSaving,setError,data,modal,setPasswordPreviews,setData,close,setNotice,save,saving}}/>}</section></div>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);