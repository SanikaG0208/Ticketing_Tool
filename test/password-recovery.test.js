import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPasswordUrl, validatePassword, verifyRecovery, saveRecoveredPassword } from '../frontend/password-recovery.js';
test('recovery URL preserves the explicit reset page',()=>{assert.equal(resetPasswordUrl('http://localhost:5173'),'http://localhost:5173/?page=reset-password');});
test('password confirmation and length are required',()=>{assert.throws(()=>validatePassword('short','short'));assert.throws(()=>validatePassword('LongPassword123','different'));});
test('invalid email tokens cannot open recovery',async()=>{await assert.rejects(verifyRecovery({},null));await assert.rejects(verifyRecovery({verifyOtp:async()=>({error:{message:'expired'}})},'expired'));});
test('email token is verified as recovery',async()=>{assert.equal(await verifyRecovery({verifyOtp:async input=>{assert.deepEqual(input,{token_hash:'token',type:'recovery'});return {data:{user:{id:'employee'}}};}},'token'),'employee');});
test('wrong session cannot save a password',async()=>{let writes=0;await assert.rejects(saveRecoveredPassword({getUser:async()=>({data:{user:{id:'other'}}}),updateUser:async()=>{writes++;}},'employee','NewPassword123','NewPassword123'));assert.equal(writes,0);});
test('verified recovery updates Auth and signs out',async()=>{const actions=[];await saveRecoveredPassword({getUser:async()=>({data:{user:{id:'employee'}}}),updateUser:async body=>{actions.push(body);return {};},signOut:async()=>{actions.push('signout');}},'employee','NewPassword123','NewPassword123');assert.deepEqual(actions,[{password:'NewPassword123'},'signout']);});
