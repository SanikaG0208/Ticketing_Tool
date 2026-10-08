import {canManageTicket} from './auth/permissions.js';
export function workStatuses(ticket,user) {
  if(['Completed','Closed'].includes(ticket.status))return [];
  return canManageTicket(ticket,user)?['Open','In Progress','Waiting','Resolved']:[];
}
export function canComplete(ticket,user) { return ticket.employee===user.id&&ticket.status==='Resolved'; }

export const waitingReasons=['Employee','IT','Developer','Approval','HR','Vendor','Other'];

export function canReopen(ticket,user){return ticket.employee===user.id&&['Resolved','Completed'].includes(ticket.status);}
