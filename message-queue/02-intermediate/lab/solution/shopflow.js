import amqp from 'amqplib';
import { RABBIT_URL, createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const MAIN = 'shopflow.orders';
const RETRY = 'shopflow.orders.retry';
const DLQ = 'shopflow.orders.dlq';
const DLX = 'shopflow.dlx';
const TOPIC = 'shopflow.order-events';

await ensureTopic(TOPIC, 3);

const kafka = createKafka('shopflow');
const kProd = kafka.producer();

await kProd.connect();

const setup = await amqp.connect(RABBIT_URL);
const ch = await setup.createChannel();

await ch.assertExchange(DLX, 'direct', { durable: true });
await ch.assertQueue(DLQ, { durable: true });
await ch.bindQueue(DLQ, DLX, 'dlq');

await ch.assertQueue(MAIN, {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': DLX,
    'x-dead-letter-routing-key': 'dlq',
  },
});

await ch.assertQueue(RETRY, {
  durable: true,
  arguments: {
    'x-message-ttl': 3000,
    'x-dead-letter-exchange': '',
    'x-dead-letter-routing-key': MAIN,
  },
});

await ch.purgeQueue(MAIN);
await ch.purgeQueue(RETRY);
await ch.purgeQueue(DLQ);
await ch.close();
await setup.close();

async function startWorker(name) {
  const wconn = await amqp.connect(RABBIT_URL);
  const wch = await wconn.createChannel();

  await wch.prefetch(1);

  wch.consume(MAIN, async (msg) => {
    if (!msg) return;

    let body;

    try {
      body = JSON.parse(msg.content.toString());
    } catch {
      console.log(`[${name}] invalid JSON → DLQ`);
      wch.nack(msg, false, false);
      return;
    }

    if (body.poison === true) {
      console.log(`[${name}] poison`, body.orderId, '→ DLQ');
      wch.nack(msg, false, false);
      return;
    }

    if (body.shouldFailOnce && !body._retried) {
      wch.sendToQueue(RETRY, Buffer.from(JSON.stringify({ ...body, _retried: true })), {
        persistent: true,
      });
      wch.ack(msg);
      console.log(`[${name}] defer`, body.orderId);
      return;
    }

    await sleep(80);

    await kProd.send({
      topic: TOPIC,
      messages: [
        {
          key: body.orderId,
          value: JSON.stringify({
            type: 'order.completed',
            orderId: body.orderId,
            at: new Date().toISOString(),
          }),
        },
      ],
    });

    wch.ack(msg);
    console.log(`[${name}] completed`, body.orderId);
  });

  return { wconn, wch };
}

const workers = [await startWorker('W1'), await startWorker('W2')];

const pubConn = await amqp.connect(RABBIT_URL);
const pub = await pubConn.createChannel();

const orders = [
  { orderId: 'SF-1', item: 'camera' },
  { orderId: 'SF-2', item: 'lens', shouldFailOnce: true },
  { orderId: 'SF-3', item: 'bag' },
  { orderId: 'SF-4', poison: true },
  { orderId: 'SF-5', item: 'tripod' },
  { orderId: 'SF-6', item: 'flash', shouldFailOnce: true },
  { orderId: 'SF-7', item: 'filter' },
  { orderId: 'SF-8', item: 'battery' },
];

for (const o of orders) {
  pub.sendToQueue(MAIN, Buffer.from(JSON.stringify(o)), { persistent: true });
}
console.log('published', orders.length, 'orders');

for (let i = 9; i <= 12; i++) {
  pub.sendToQueue(MAIN, Buffer.from(JSON.stringify({ orderId: `SF-${i}`, item: 'bulk' })), {
    persistent: true,
  });
}

const bi = kafka.consumer({ groupId: 'shopflow-bi' });

await bi.connect();
await bi.subscribe({ topic: TOPIC, fromBeginning: true });

let completed = 0;
const expectMin = 11;

await new Promise((resolve) => {
  const timer = setTimeout(resolve, 30000);

  bi.run({
    eachMessage: async ({ message }) => {
      const ev = JSON.parse(message.value.toString());

      if (ev.type === 'order.completed') {
        completed += 1;
        console.log('[BI]', ev.orderId, 'total=', completed);
      }

      if (completed >= expectMin) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await sleep(3500);

console.log('ตรวจ DLQ ใน UI: shopflow.orders.dlq (ควรมี SF-4 poison)');
console.log('BI completed count:', completed);

await bi.disconnect();
await kProd.disconnect();
await pub.close();
await pubConn.close();

for (const w of workers) {
  await w.wch.close();
  await w.wconn.close();
}

console.log('ShopFlow lab solution finished');
