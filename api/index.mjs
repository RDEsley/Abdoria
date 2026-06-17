import serverless from 'serverless-http';

let app;
let handler;

export default async function vercelHandler(req, res) {
  const { connectDB } = await import('../lib/server-dist/server/src/db.js');
  const { createApp } = await import('../lib/server-dist/server/src/app.js');

  await connectDB();
  if (!app) app = createApp();
  if (!handler) handler = serverless(app);
  return handler(req, res);
}
