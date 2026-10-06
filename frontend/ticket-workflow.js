export function workStatuses(ticket,user) {
  if(ticket.status==='Completed')return [];
  return user.department==='IT'||ticket.assigned_to===user.id?['Open','In Progress','Resolved']:[];
}
export function canComplete(ticket,user) { return ticket.employee===user.id&&ticket.status==='Resolved'; }
