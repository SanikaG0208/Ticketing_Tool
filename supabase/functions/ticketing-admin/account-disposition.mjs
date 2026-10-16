export function accountDisposition(profile){
 if(!profile)return 'create';
 return profile.active===false&&profile.left_at?'reactivate':'duplicate';
}
