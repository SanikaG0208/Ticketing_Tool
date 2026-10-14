export function employeesForDepartment(users, department) {
 return users.filter(u=>u.department===department&&u.active!==false);
}
export function validTicketRecipient(users,department,id){return employeesForDepartment(users,department).some(u=>u.id===id);}
export function pocSelection(users,department,handler,selected=''){
 const pocs=employeesForDepartment(users,department).filter(u=>u.is_poc===true);
 const self=pocs.find(u=>u.id===handler);
 return {pocs,disabled:!!self||pocs.length<=1,value:self?.id||(pocs.length===1?pocs[0].id:pocs.some(u=>u.id===selected)?selected:'')};
}
