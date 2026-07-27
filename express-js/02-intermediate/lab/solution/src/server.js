import { createApp } from './app.js';

process.env.JWT_SECRET ??= 'lab-secret';
const PORT = process.env.PORT ?? 3030;

createApp().listen(PORT, () => {
  console.log(`ShopForge API on http://localhost:${PORT}`);
});
