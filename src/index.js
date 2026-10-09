import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import authRouter from './routes/auth.js';

const PORT = Number(process.env.PORT ?? 4000);
// FRONTEND_URL puede ser una o varias URLs separadas por coma:
// "http://localhost:5173,https://tu-front.vercel.app"
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json());

app.use(
  cors({
    origin(origin, cb) {
      // Permite peticiones sin origin (curl, health checks) y las del front
      if (!origin || FRONTEND_URL.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS bloqueado para origin: ${origin}`));
    },
  })
);

app.get('/api/health', (req, res) => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    ok: true,
    service: 'mapasturisticosbknd',
    db: states[mongoose.connection.readyState] ?? 'unknown',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);

// 404 para rutas API desconocidas
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ Falta MONGODB_URI en .env');
  process.exit(1);
}

try {
  await connectDB(MONGODB_URI);
  console.log('✅ MongoDB conectado');
  app.listen(PORT, () => {
    console.log(`🚀 API lista en http://localhost:${PORT}`);
    console.log(`🌐 FRONTEND_URL permitido: ${FRONTEND_URL.join(', ')}`);
  });
} catch (err) {
  console.error('❌ No se pudo conectar a MongoDB:', err.message);
  process.exit(1);
}
