import { createApp } from '../lib/server-dist/server/src/app.js';

const app = createApp();

/** Express app como handler Vercel (sem serverless-http). */
export default function handler(req, res) {
  app(req, res);
}
