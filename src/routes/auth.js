import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/requireAuth.js';

const router = Router();

// POST /api/auth/register — crea usuario y devuelve token
router.post('/register', async (req, res) => {
  try {
    const { name = '', email = '', password = '', role = 'visitante' } = req.body ?? {};
    if (!name.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: 'name, email y password son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Ese correo ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    });
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login — valida credenciales y devuelve token
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body ?? {};
    if (!email.trim() || !password) {
      return res.status(400).json({ error: 'email y password son obligatorios' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me — perfil del token (para la página Entrar del front)
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.sub).select('_id name email role createdAt');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user });
});

export default router;
