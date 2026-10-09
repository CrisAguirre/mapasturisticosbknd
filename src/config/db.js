import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('Falta MONGODB_URI en las variables de entorno (.env)');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}
