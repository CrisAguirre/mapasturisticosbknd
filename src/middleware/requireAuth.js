import jwt from 'jsonwebtoken';

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Falta JWT_SECRET en las variables de entorno (.env)');
  return s;
}

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, getSecret(), {
    expiresIn: '7d',
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado: falta token Bearer' });
  }
  try {
    req.auth = jwt.verify(token, getSecret());
    return next();
  } catch {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }
}
