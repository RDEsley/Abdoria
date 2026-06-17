import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __abdoriaMongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.__abdoriaMongoose ?? { conn: null, promise: null };
global.__abdoriaMongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Defina MONGODB_URI nas variáveis de ambiente.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 5,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
