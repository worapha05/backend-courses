/**
 * Layered architecture demo (in-memory)
 * Run: npm run intermediate:layered
 */
import { createApp } from './app.js';

const PORT = process.env.PORT ?? 3020;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Layered API on http://localhost:${PORT}`);
});
