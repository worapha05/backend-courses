import { createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const TOPIC = 'bootcamp.eos.payments';

await ensureTopic(TOPIC, 3);

const kafka = createKafka('eos-demo');
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
});

await producer.connect();

const payment = {
  id: 'pay-42',
  orderId: 'ORD-42',
  amount: 1500,
};

for (let i = 0; i < 2; i++) {
  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: payment.orderId,
        value: JSON.stringify(payment),
        headers: { 'idempotency-key': Buffer.from(payment.id) },
      },
    ],
  });
  console.log('produced attempt', i + 1);
}

await producer.disconnect();

const processed = new Set();
let chargeCount = 0;

function chargeCard(p) {
  chargeCount += 1;
  console.log(' CHARGED card for', p.orderId, 'count=', chargeCount);
}

const consumer = kafka.consumer({ groupId: 'eos-ledger' });

await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

let seen = 0;

await new Promise((resolve) => {
  const timer = setTimeout(resolve, 10000);

  consumer.run({
    eachMessage: async ({ message }) => {
      const body = JSON.parse(message.value.toString());
      const key = message.headers?.['idempotency-key']?.toString() || body.id;

      for (const pass of [1, 2]) {
        if (processed.has(key)) {
          console.log(`skip duplicate ${key} (pass ${pass})`);
        } else {
          chargeCard(body);
          processed.add(key);
        }
      }

      seen += 1;
      if (seen >= 1) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await consumer.disconnect();

console.log(`\nสรุป: chargeCount=${chargeCount} (ต้องเป็น 1 แม้ redelivery) processed=`, [
  ...processed,
]);
