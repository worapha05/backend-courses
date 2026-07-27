import amqp from 'amqplib';
import { RABBIT_URL, createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const JOB_Q = 'bootcamp.pipeline.jobs';
const EVENT_TOPIC = 'bootcamp.pipeline.events';

await ensureTopic(EVENT_TOPIC, 3);

const kafka = createKafka('pipeline');
const kProducer = kafka.producer();

await kProducer.connect();

const conn = await amqp.connect(RABBIT_URL);
const ch = await conn.createChannel();

await ch.assertQueue(JOB_Q, { durable: true });
await ch.purgeQueue(JOB_Q);
await ch.prefetch(1);

async function apiCreateOrder(input) {
  if (!input.orderId || !input.email) {
    throw new Error('invalid payload');
  }

  const job = {
    id: `job-${input.orderId}`,
    type: 'order.process',
    data: input,
    enqueuedAt: new Date().toISOString(),
  };

  ch.sendToQueue(JOB_Q, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    messageId: job.id,
    headers: { 'x-correlation-id': input.orderId },
  });

  return { status: 202, accepted: true, jobId: job.id };
}

const processed = [];

ch.consume(JOB_Q, async (msg) => {
  if (!msg) return;

  const job = JSON.parse(msg.content.toString());
  console.log('[worker] processing', job.id);

  await sleep(150);

  const event = {
    type: 'order.processed',
    orderId: job.data.orderId,
    email: job.data.email,
    processedAt: new Date().toISOString(),
  };

  await kProducer.send({
    topic: EVENT_TOPIC,
    messages: [
      {
        key: event.orderId,
        value: JSON.stringify(event),
        headers: {
          'correlation-id': Buffer.from(String(msg.properties.headers?.['x-correlation-id'] ?? '')),
        },
      },
    ],
  });

  ch.ack(msg);
  processed.push(event.orderId);
  console.log('[worker] done → kafka', event.orderId);
});

const consumer = kafka.consumer({ groupId: 'pipeline-analytics' });

await consumer.connect();
await consumer.subscribe({ topic: EVENT_TOPIC, fromBeginning: true });

const seen = [];
const waitAnalytics = new Promise((resolve) => {
  consumer.run({
    eachMessage: async ({ message }) => {
      const ev = JSON.parse(message.value.toString());

      console.log('[analytics]', ev);
      seen.push(ev.orderId);

      if (seen.length >= 2) resolve();
    },
  });
});

await sleep(1000);

console.log('API:', await apiCreateOrder({ orderId: 'ORD-9001', email: 'a@ex.com' }));
console.log('API:', await apiCreateOrder({ orderId: 'ORD-9002', email: 'b@ex.com' }));

await Promise.race([waitAnalytics, sleep(10000)]);

await consumer.disconnect();
await kProducer.disconnect();
await ch.close();
await conn.close();

console.log('pipeline complete', { processed, seen });
