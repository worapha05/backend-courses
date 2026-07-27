import { createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const TOPIC = 'bootcamp.orders';

await ensureTopic(TOPIC, 3);

const kafka = createKafka('bootcamp-beginner');
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'bootcamp-beginner-readers' });

await producer.connect();
await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

const received = [];

const consumePromise = new Promise((resolve) => {
  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      const row = {
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString(),
        value: value ? JSON.parse(value) : null,
      };

      console.log('consumed', row);
      received.push(row);

      if (received.length >= 3) resolve();
    },
  });
});

await sleep(1500);

const orders = [
  { id: 'ord-1', item: 'Tee', qty: 1 },
  { id: 'ord-2', item: 'Mug', qty: 2 },
  { id: 'ord-3', item: 'Hat', qty: 1 },
];

for (const order of orders) {
  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: order.id,
        value: JSON.stringify({ type: 'order.created', ...order }),
      },
    ],
  });
  console.log('produced', order.id);
}

await Promise.race([consumePromise, sleep(15000)]);

await producer.disconnect();
await consumer.disconnect();

console.log(`done — received ${received.length} messages across partitions`);
console.log('partitions used:', [...new Set(received.map((r) => r.partition))].sort());
