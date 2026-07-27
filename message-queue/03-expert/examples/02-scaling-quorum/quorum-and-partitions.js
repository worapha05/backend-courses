import { withRabbit, createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const TOPIC = 'bootcamp.scale.events';

await ensureTopic(TOPIC, 6);

const kafka = createKafka('scale-demo');
const producer = kafka.producer();

await producer.connect();

const started = Date.now();
const batch = [];

for (let i = 0; i < 100; i++) {
  batch.push({
    key: `user-${i % 20}`,
    value: JSON.stringify({ n: i, at: Date.now() }),
  });
}

await producer.send({ topic: TOPIC, messages: batch });
console.log(`produced 100 msgs in ${Date.now() - started}ms to ${TOPIC} (6 partitions)`);

await producer.disconnect();

const consumer = kafka.consumer({ groupId: `scale-count-${Date.now()}` });

await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

const perPartition = new Map();
let count = 0;

const counting = new Promise((resolve) => {
  const timer = setTimeout(resolve, 8000);

  consumer.run({
    eachMessage: async ({ partition }) => {
      perPartition.set(partition, (perPartition.get(partition) || 0) + 1);

      count += 1;
      if (count >= 100) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await sleep(500);
await counting;
await consumer.disconnect();

console.log('per-partition counts:', Object.fromEntries([...perPartition].sort()));

await withRabbit(async (ch) => {
  const q = 'bootcamp.quorum.orders';

  try {
    await ch.assertQueue(q, {
      durable: true,
      arguments: { 'x-queue-type': 'quorum' },
    });

    ch.sendToQueue(q, Buffer.from(JSON.stringify({ id: 'qq-1' })), {
      persistent: true,
    });

    console.log('quorum queue asserted + message sent:', q);
  } catch (err) {
    console.log('quorum queue note:', err.message);
    await ch.assertQueue(q + '.classic', { durable: true });
  }
});
