export function employeesForDepartment(users, department) {
  return users.filter(employee => employee.department === department && employee.active !== false);
}
export function validTicketRecipient(users, department, employeeId) {
  return employeesForDepartment(users,department).some(employee => employee.id === employeeId);
}
export function typesForDepartment(types,department) {
  return types.filter(type=>type.department===department);
}
export function validTicketCategory(types,department,typeName,subtype) {
  return typesForDepartment(types,department).some(type=>type.name===typeName&&type.subtypes.includes(subtype));
}
