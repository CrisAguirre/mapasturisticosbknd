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
        user: { id: dbUser._id, name: dbUser.name, email: dbUser.email, role: dbUser.role, foto: dbUser.foto ?? null },
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
      user: { id: 'admin', name: 'Administración', email: admin.user || 'admin', role: 'admin', foto: null },
    });
  }
  const user = await User.findById(req.auth.sub).select('_id name email role foto createdAt');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user });
});

// PATCH /api/auth/me — actualizar perfil propio (para la sección Cuenta).
// Editable: name, foto (URL https o vacía para quitarla), cambio de clave
// (currentPassword + newPassword).
// Solo lectura: email (identificador de ingreso) y role (lo asigna la admin).
// La cuenta admin vive en variables de entorno: no se edita aquí.
router.patch('/me', requireAuth, async (req, res) => {
  try {
    if (req.auth.sub === 'admin') {
      return res.status(403).json({ error: 'La cuenta de administración se configura en el servidor' });
    }
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { name, foto, currentPassword = '', newPassword = '' } = req.body ?? {};
    let cambió = false;

    if (name !== undefined) {
      const limpio = String(name).trim();
      if (limpio.length < 2 || limpio.length > 80) {
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 80 caracteres' });
      }
      if (limpio !== user.name) {
        user.name = limpio;
        cambió = true;
      }
    }

    if (foto !== undefined) {
      const url = String(foto).trim();
      if (url && (url.length > 500 || !/^(https?:\/\/|data:image\/)/.test(url))) {
        return res.status(400).json({ error: 'La foto debe ser una URL https válida o vacía para quitarla' });
      }
      const valor = url || null;
      if (valor !== (user.foto ?? null)) {
        user.foto = valor;
        cambió = true;
      }
    }

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }
      const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
      user.passwordHash = await bcrypt.hash(String(newPassword), 10);
      cambió = true;
    }

    if (cambió) await user.save();
    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, foto: user.foto ?? null, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

export default router;
