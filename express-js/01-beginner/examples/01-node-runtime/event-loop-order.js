/**
 * Event loop ordering — and an ESM gotcha
 * Run: node 01-beginner/examples/01-node-runtime/event-loop-order.js
 *
 * Important (Node + ES Modules):
 * During ESM module evaluation, Promise microtasks scheduled in the module body
 * are flushed BEFORE process.nextTick callbacks from that same body.
 * In classic scripts / CommonJS, nextTick still runs first.
 *
 * Compare:
 * node -e '...'      → nextTick before Promise
 * node --input-type=module -e '...' → Promise before nextTick
 */
const order = [];

order.push('1) sync start');
setTimeout(() => order.push('4) timer (setTimeout 0)'), 0);
Promise.resolve()
  .then(() => order.push('3a) promise microtask'))
  .then(() => order.push('3b) promise microtask chain'));
queueMicrotask(() => order.push('3c) queueMicrotask'));
process.nextTick(() => order.push('2) nextTick'));
order.push('1b) sync end');

setTimeout(() => {
  console.log(order.join('\n'));
  console.log(`\nmodule type: ESM (package.json "type": "module")`);
  console.log('Observed here: sync → promise/queueMicrotask → nextTick → timer');
  console.log('In CommonJS scripts: sync → nextTick → promise/queueMicrotask → timer');
}, 10);
