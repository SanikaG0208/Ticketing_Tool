export function httpError(status, message) { return Object.assign(new Error(message), { status }); }

export function createAuthenticate(makeClient) {
  return async function authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
      if (!token) throw httpError(401, 'Sign in is required');
      const client = makeClient(token);
      const { data, error } = await client.auth.getUser(token);
      if (error || !data?.user) throw httpError(401, 'Invalid or expired session');
      const profile = await client.from('profiles').select('*, departments(name)').eq('id', data.user.id).maybeSingle();
      if (profile.error) throw httpError(503, 'Unable to verify employee access');
      if (!profile.data?.active) throw httpError(403, 'Employee account is not provisioned or is inactive');
      req.user = data.user;
      req.profile = profile.data;
      req.db = client;
      next();
    } catch (error) { next(error); }
  };
}

export function requireIT(req, res, next) {
  if (req.profile?.departments?.name !== 'IT') return next(httpError(403, 'IT access required'));
  next();
}
