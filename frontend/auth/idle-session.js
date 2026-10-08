export const IDLE_LIMIT = 30 * 60 * 1000;
export const IDLE_WARNING = 60 * 1000;
export function idleState(lastActivity, now = Date.now()) {
 const remaining = Math.max(0, IDLE_LIMIT - (now - lastActivity));
 return {remaining, warning: remaining > 0 && remaining <= IDLE_WARNING, expired: remaining === 0};
}
export const activityKey = id => `ticketing:activity:${id}`;
export function readActivity(storage, id, now = Date.now()) {
 try {const n=Number(storage.getItem(activityKey(id)));return n>0&&n<=now?n:now;}catch{return now;}
}
