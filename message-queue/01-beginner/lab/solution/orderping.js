import { withRabbit, createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const TOPIC = 'orderping.orders';

await withRabbit(async (ch) => {
  const exchange = 'orderping.events';

  await ch.assertExchange(exchange, 'topic', { durable: true });

  const emailQ = await ch.assertQueue('orderping.email', { durable: true });
  const smsQ = await ch.assertQueue('orderping.sms', { durable: true });
  const auditQ = await ch.assertQueue('orderping.audit.rmq', { durable: true });

  await ch.bindQueue(emailQ.queue, exchange, 'order.created.*');
  await ch.bindQueue(smsQ.queue, exchange, 'order.shipped.*');
  await ch.bindQueue(auditQ.queue, exchange, '#');

  await ch.prefetch(1);

  const emailDone = new Promise((resolve) => {
    let acked = 0;

    ch.consume(emailQ.queue, async (msg) => {
      if (!msg) return;

      const body = JSON.parse(msg.content.toString());
      const orderId = body.data?.orderId ?? '';

      if (String(orderId).endsWith('-FAIL')) {
        console.log('[email] poison → nack no-requeue', orderId);
        ch.nack(msg, false, false);
        return;
      }

      console.log('[email] sending to', body.data?.email, 'for', orderId);
      await sleep(50);
      ch.ack(msg);

      acked += 1;
      if (acked >= 2) resolve();
    });
  });

  ch.consume(smsQ.queue, (msg) => {
    if (!msg) return;

    console.log('[sms]', msg.content.toString());
    ch.ack(msg);
  });

  ch.consume(auditQ.queue, (msg) => {
    if (!msg) return;

    console.log('[audit.rmq]', msg.fields.routingKey, msg.content.toString());
    ch.ack(msg);
  });

  const publish = (key, body) => {
    ch.publish(exchange, key, Buffer.from(JSON.stringify(body)), {
      contentType: 'application/json',
      persistent: true,
      messageId: body.id,
    });
    console.log('rmq published', key, body.id);
  };

  publish('order.created.th', {
    id: 'evt-1',
    type: 'order.created',
    version: 1,
    data: { orderId: 'ORD-1001', email: 'th@example.com' },
  });

  publish('order.created.us', {
    id: 'evt-2',
    type: 'order.created',
    version: 1,
    data: { orderId: 'ORD-1002', email: 'us@example.com' },
  });

  publish('order.shipped.th', {
    id: 'evt-3',
    type: 'order.shipped',
    version: 1,
    data: { orderId: 'ORD-1001', phone: '+66810000000' },
  });

  publish('payment.failed.th', {
    id: 'evt-4',
    type: 'payment.failed',
    version: 1,
    data: { orderId: 'ORD-1003', reason: 'card_declined' },
  });

  await Promise.race([emailDone, sleep(5000)]);
});

await ensureTopic(TOPIC, 3);

const kafka = createKafka('orderping');
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'orderping-analytics' });

await producer.connect();
await consumer.connect();
await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

const got = [];
const done = new Promise((resolve) => {
  consumer.run({
    eachMessage: async ({ partition, message }) => {
      const value = JSON.parse(message.value.toString());

      console.log('[analytics]', {
        partition,
        offset: message.offset,
        orderId: value.orderId,
      });

      got.push(value);
      if (got.length >= 5) resolve();
    },
  });
});

await sleep(1500);

for (let i = 1; i <= 5; i++) {
  const orderId = `ORD-K-${i}`;

  await producer.send({
    topic: TOPIC,
    messages: [
      {
        key: orderId,
        value: JSON.stringify({
          type: 'order.created',
          orderId,
          amount: 100 * i,
        }),
      },
    ],
  });

  console.log('kafka produced', orderId);
}

await Promise.race([done, sleep(15000)]);

await producer.disconnect();
await consumer.disconnect();

console.log('OrderPing lab solution finished');
