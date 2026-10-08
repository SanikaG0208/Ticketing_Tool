import {isAdmin} from './auth/permissions.js';
export function protectedPage(requested,user) {
  if(!user)return 'login';
  if(['users','departments','insights','dashboard','downtime','sla','team-performance','reports','export'].includes(requested))return isAdmin(user)?requested:'tickets';
  return 'tickets';
}
