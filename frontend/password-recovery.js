export function resetPasswordUrl(origin) {
  return new URL('/?page=reset-password', origin).href;
}
export function validatePassword(password, confirmation) {
  if (password.length < 12 || password.length > 128) throw new Error('Use a password between 12 and 128 characters.');
  if (password !== confirmation) throw new Error('Passwords do not match.');
}
export async function verifyRecovery(auth, tokenHash) {
  if (!tokenHash) throw new Error('This reset link is missing or expired. Request a new link.');
  const result = await auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (result.error || !result.data?.user) throw new Error('This reset link is invalid or expired. Request a new link.');
  return result.data.user.id;
}
export async function saveRecoveredPassword(auth, userId, password, confirmation) {
  validatePassword(password, confirmation);
  const verified = await auth.getUser();
  if (verified.error || verified.data?.user?.id !== userId) throw new Error('Your reset session expired. Request a new link.');
  const result = await auth.updateUser({ password });
  if (result.error) throw new Error(result.error.message);
  await auth.signOut();
}
