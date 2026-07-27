import { createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const TOPIC = 'bootcamp.keyed-orders';

await ensureTopic(TOPIC, 3);

const kafka = createKafka('bootcamp-intermediate');
const producer = kafka.producer();

await producer.connect();

const events = [
  { key: 'ORD-A', type: 'created' },
  { key: 'ORD-A', type: 'paid' },
  { key: 'ORD-A', type: 'shipped' },
  { key: 'ORD-B', type: 'created' },
  { key: 'ORD-B', type: 'paid' },
  { key: 'ORD-C', type: 'created' },
];

for (const e of events) {
  const result = await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: e.key,
        value: JSON.stringify({ orderId: e.key, type: e.type, at: Date.now() }),
      },
    ],
  });

  console.log('produced', e, '→ partition', result[0].partition);
}

await producer.disconnect();

const consumer = kafka.consumer({ groupId: 'bootcamp-keyed-readers' });

await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

const byOrder = new Map();
let count = 0;

const reading = new Promise((resolve) => {
  const timer = setTimeout(resolve, 10000);

  consumer.run({
    autoCommit: true,
    eachMessage: async ({ partition, message }) => {
      const body = JSON.parse(message.value.toString());
      const list = byOrder.get(body.orderId) || [];

      list.push(body.type);
      byOrder.set(body.orderId, list);

      console.log(`offset=${message.offset} p=${partition} ${body.orderId}.${body.type}`);

      count += 1;
      if (count >= events.length) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await sleep(1500);
await reading;
await consumer.disconnect();

console.log('\nลำดับต่อ order (ต้องเรียงถ้าอยู่ partition เดียว):');
for (const [orderId, types] of byOrder) {
  console.log(orderId, types.join(' → '));
}
