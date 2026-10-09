import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/requireAuth.js';

const router = Router();

function adminConfig() {
  return {
    user: (process.env.ADMIN_USER || '').trim(),
    hash: (process.env.ADMIN_PASSWORD_HASH || '').trim(),
  };
}

// POST /api/auth/register — deshabilitado: la plataforma usa un único
// usuario administrador configurado por variables de entorno.
router.post('/register', (req, res) => {
  return res.status(403).json({ error: 'El registro público está deshabilitado' });
});

// POST /api/auth/login — acepta { user | username | email, password }.
// 1) Usuario único admin por entorno (ADMIN_USER / ADMIN_PASSWORD_HASH).
// 2) Usuarios de la base de datos (por email).
router.post('/login', async (req, res) => {
  try {
    const { email = '', user = '', username = '', password = '' } = req.body ?? {};
    const identifier = String(email || user || username || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const admin = adminConfig();
    if (admin.user && identifier.toLowerCase() === admin.user.toLowerCase()) {
      if (!admin.hash) {
        return res.status(500).json({ error: 'Admin no configurado en el servidor' });
      }
      const ok = await bcrypt.compare(password, admin.hash);
      if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
      const token = signToken({ _id: 'admin', role: 'admin' });
      return res.json({
        token,
        user: { id: 'admin', name: 'Administración', email: identifier, role: 'admin' },
      });
    }

    const dbUser = await User.findOne({ email: identifier.toLowerCase() });
    if (!dbUser) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, dbUser.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(dbUser);
    return res.json({
      token,
      user: { id: dbUser._id, name: dbUser.name, email: dbUser.email, role: dbUser.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me — perfil del token (para la página Entrar del front)
router.get('/me', requireAuth, async (req, res) => {
  if (req.auth.sub === 'admin') {
    const admin = adminConfig();
    return res.json({
      user: { id: 'admin', name: 'Administración', email: admin.user || 'admin', role: 'admin' },
    });
  }
  const user = await User.findById(req.auth.sub).select('_id name email role createdAt');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user });
});

export default router;
