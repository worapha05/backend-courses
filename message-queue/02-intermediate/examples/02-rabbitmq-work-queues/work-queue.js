import amqp from 'amqplib';
import { RABBIT_URL, sleep } from '../../lib/connections.js';

const QUEUE = 'bootcamp.work.jobs';

async function startWorker(name, slowMs) {
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();

  await ch.assertQueue(QUEUE, { durable: true });
  await ch.prefetch(1);

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    const body = JSON.parse(msg.content.toString());
    console.log(`[${name}] start`, body.id);
    await sleep(slowMs);
    console.log(`[${name}] done `, body.id);
    ch.ack(msg);
  });

  return { conn, ch, name };
}

const conn = await amqp.connect(RABBIT_URL);
const pub = await conn.createChannel();

await pub.assertQueue(QUEUE, { durable: true });
await pub.purgeQueue(QUEUE);

const w1 = await startWorker('W1-fast', 100);
const w2 = await startWorker('W2-slow', 400);

for (let i = 1; i <= 6; i++) {
  pub.sendToQueue(QUEUE, Buffer.from(JSON.stringify({ id: `job-${i}`, payload: 'resize' })), {
    persistent: true,
  });
}
console.log('published 6 jobs');

await sleep(4000);

await pub.close();
await conn.close();
await w1.ch.close();
await w1.conn.close();
await w2.ch.close();
await w2.conn.close();
