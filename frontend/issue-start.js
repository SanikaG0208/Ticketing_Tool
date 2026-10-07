export function issueStartUtc(value,now=Date.now()) {
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))throw new Error('Enter a valid issue start date and time.');
 const date=new Date(value+'+05:30');
 if(!Number.isFinite(date.getTime())||date.getTime()>now)throw new Error('Issue start time must not be in the future.');
 return date.toISOString();
}
