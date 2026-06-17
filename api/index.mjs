import serverless from 'serverless-http';
import { createApp } from '../lib/server-dist/server/src/app.js';

export default serverless(createApp());
