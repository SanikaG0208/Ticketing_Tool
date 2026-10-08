const key=(userId,name)=>`ticketing:draft:${userId}:${name}`;
export function readDraft(userId,name){try{return JSON.parse(sessionStorage.getItem(key(userId,name))||'null')||{};}catch{return {};}}
export function saveDraft(userId,name,values){try{sessionStorage.setItem(key(userId,name),JSON.stringify(values));}catch{}}
export function clearDraft(userId,name){try{sessionStorage.removeItem(key(userId,name));}catch{}}
