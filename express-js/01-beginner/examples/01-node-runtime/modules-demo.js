/**
 * ESM module demo — Node.js Core
 * Run: node 01-beginner/examples/01-node-runtime/modules-demo.js
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { add, multiply } from './math.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('=== ESM basics ===');
console.log('add(2, 3) =', add(2, 3));
console.log('multiply(4, 5) =', multiply(4, 5));
console.log('__dirname via import.meta.url =', __dirname);

// Dynamic import — โหลดตอน runtime ตามเงื่อนไข
const mode = process.env.DEMO_MODE ?? 'math';
if (mode === 'math') {
  const dynamic = await import('./math.js');
  console.log('dynamic import add(10, 1) =', dynamic.add(10, 1));
}

// Interop: อ่าน JSON ผ่าน createRequire (หรือใช้ fs.readFile + JSON.parse)
const pkgPath = join(__dirname, '../../../package.json');
const pkg = require(pkgPath);
console.log('bootcamp name =', pkg.name);
console.log('node version =', process.version);
