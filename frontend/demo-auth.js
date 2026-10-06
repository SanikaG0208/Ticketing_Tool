// Browser-only demo credentials. This is not a production security boundary.
export const seedCredential = {
  salt: 'desk-test-fixture',
  hash: '2779a69f0e336cf3b10358fbb3f7d5cfcc11574748992075024a04e1f6547d95'
};
async function derive(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', iterations:100000, salt:encoder.encode(salt) }, key, 256);
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2,'0')).join('');
}
export async function hashDemoPassword(password) {
  const salt = crypto.randomUUID();
  return { salt, hash:await derive(password,salt) };
}
export async function verifyDemoPassword(password, credential) {
  if (!password || !credential?.salt || !credential?.hash) return false;
  return (await derive(password,credential.salt)) === credential.hash;
}
