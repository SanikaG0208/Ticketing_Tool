export function employeesForDepartment(users, department) {
  return users.filter(employee => employee.department === department && employee.active !== false && employee.is_poc === true);
}
export function validTicketRecipient(users, department, employeeId) {
  return employeesForDepartment(users,department).some(employee => employee.id === employeeId);
}
