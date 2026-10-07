export function protectedPage(requested,user) {
  if(!user)return 'login';
  if(['users','departments','insights'].includes(requested))return user.department==='IT'?requested:'tickets';
  return 'tickets';
}
