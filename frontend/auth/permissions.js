export const isAdmin=user=>user?.role==='admin';
export const isPoc=user=>!isAdmin(user)&&user?.is_poc===true;
export const canManageTicket=(ticket,user)=>isAdmin(user)||ticket.assigned_to===user?.id;
export const canViewTicket=(ticket,user)=>!!user&&(isAdmin(user)||(isPoc(user)&&ticket.department_id===user.department_id)||ticket.employee===user.id||ticket.assigned_to===user.id);
export const workspaceRole=user=>isAdmin(user)?'Admin':isPoc(user)?'POC':'Employee';

export const canEditTicketDetails=(ticket,user)=>!['Completed','Closed'].includes(ticket.status)&&(isAdmin(user)||ticket.employee===user?.id);
