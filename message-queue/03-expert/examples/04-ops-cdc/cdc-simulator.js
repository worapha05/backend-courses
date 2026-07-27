import { createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const CDC_TOPIC = 'bootcamp.cdc.products';

await ensureTopic(CDC_TOPIC, 3);

const kafka = createKafka('cdc-ops');
const producer = kafka.producer();

await producer.connect();

const cdcEvents = [
  {
    op: 'c',
    before: null,
    after: { id: 1, sku: 'TEE-1', price: 390, active: true },
    ts_ms: Date.now(),
  },
  {
    op: 'u',
    before: { id: 1, sku: 'TEE-1', price: 390, active: true },
    after: { id: 1, sku: 'TEE-1', price: 350, active: true },
    ts_ms: Date.now() + 1,
  },
  {
    op: 'u',
    before: { id: 1, sku: 'TEE-1', price: 350, active: true },
    after: { id: 1, sku: 'TEE-1', price: 350, active: false },
    ts_ms: Date.now() + 2,
  },
];

for (const ev of cdcEvents) {
  await producer.send({
    topic: CDC_TOPIC,
    messages: [
      {
        key: String(ev.after?.id ?? ev.before?.id),
        value: JSON.stringify(ev),
      },
    ],
  });
}
console.log('CDC events produced:', cdcEvents.length);

const readModel = new Map();

const consumer = kafka.consumer({ groupId: 'cdc-readmodel' });

await consumer.connect();
await consumer.subscribe({ topic: CDC_TOPIC, fromBeginning: true });

let consumed = 0;
const produced = cdcEvents.length;

const applying = new Promise((resolve) => {
  const timer = setTimeout(resolve, 8000);

  consumer.run({
    eachMessage: async ({ partition, message }) => {
      const ev = JSON.parse(message.value.toString());
      const id = ev.after?.id ?? ev.before?.id;

      if (ev.op === 'd') {
        readModel.delete(id);
      } else if (ev.after) {
        readModel.set(id, ev.after);
      }

      consumed += 1;
      const lagApprox = Math.max(produced - consumed, 0);

      console.log(
        `apply op=${ev.op} id=${id} partition=${partition} approx_lag=${lagApprox}`,
        'readModel=',
        readModel.get(id),
      );

      if (consumed >= produced) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await sleep(500);
await applying;

await consumer.disconnect();
await producer.disconnect();

console.log('final read model:', Object.fromEntries(readModel));
