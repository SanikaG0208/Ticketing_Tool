export function escapeHtml(value) {
 return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function ticketEmail(ticket,creator,assignee,recipient,appUrl) {
 const assigned=recipient.id===assignee.id;
 const subject=`Ticket #${ticket.number} ${assigned?'assigned to you':'created'}`;
 const text=`Hello ${recipient.name},\n\n${assigned?'A ticket has been assigned to you.':'Your ticket has been created.'}\nTicket #${ticket.number}: ${ticket.requirements}\nRaised by: ${creator.name}\nAssigned to: ${assignee.name}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\n\nSign in: ${appUrl}`;
 const html=`<html><body style="font-family:Arial,sans-serif;background:#f4f6f8;color:#172d39;padding:24px"><div style="max-width:560px;margin:auto;background:white;padding:32px;border-radius:12px"><p style="color:#197c71;font-size:22px;font-weight:bold">B2B InDemand · Ticketing Tool</p><h1 style="font-size:24px">${escapeHtml(subject)}</h1><p>Hello ${escapeHtml(recipient.name)},</p><p>${assigned?'A new request is waiting for your attention.':'Your request has been received.'}</p><h2 style="font-size:18px">${escapeHtml(ticket.requirements)}</h2><p>Raised by: ${escapeHtml(creator.name)}<br>Assigned to: ${escapeHtml(assignee.name)}<br>Priority: ${escapeHtml(ticket.priority)}<br>Status: ${escapeHtml(ticket.status)}</p><p style="margin:28px 0"><a href="${escapeHtml(appUrl)}" style="background:#197c71;color:white;padding:14px 22px;text-decoration:none;border-radius:6px">View tickets</a></p><p style="font-size:12px;color:#61717b">Sign in to view the request and add comments.</p></div></body></html>`;
 return {subject,text,html};
}
