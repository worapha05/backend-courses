/**
 * JWT auth demo with Helmet + CORS
 * Run: JWT_SECRET=dev-secret-change-me npm run intermediate:auth
 */
import { createApp } from './app.js';

const PORT = process.env.PORT ?? 3022;
process.env.JWT_SECRET ??= 'dev-secret-change-me';

const app = createApp();
app.listen(PORT, () => {
  console.log(`Auth API on http://localhost:${PORT}`);
});
