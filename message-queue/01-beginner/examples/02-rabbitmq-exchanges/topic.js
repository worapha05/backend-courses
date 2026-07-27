import { withRabbit } from '../../lib/connections.js';

await withRabbit(async (ch) => {
  const exchange = 'bootcamp.topic.events';

  await ch.assertExchange(exchange, 'topic', { durable: true });

  const th = await ch.assertQueue('bootcamp.events.th', { durable: true });
  const created = await ch.assertQueue('bootcamp.events.created', { durable: true });
  const audit = await ch.assertQueue('bootcamp.events.audit', { durable: true });

  await ch.bindQueue(th.queue, exchange, 'order.*.th');
  await ch.bindQueue(created.queue, exchange, 'order.created.#');
  await ch.bindQueue(audit.queue, exchange, '#');

  const label = {
    [th.queue]: 'th',
    [created.queue]: 'created',
    [audit.queue]: 'audit',
  };

  for (const q of [th, created, audit]) {
    ch.consume(q.queue, (msg) => {
      if (!msg) return;

      console.log(`[${label[q.queue]}] key=${msg.fields.routingKey}`, msg.content.toString());
      ch.ack(msg);
    });
  }

  const publish = (key, body) => {
    ch.publish(exchange, key, Buffer.from(JSON.stringify(body)), {
      contentType: 'application/json',
      persistent: true,
    });

    console.log('published', key);
  };

  publish('order.created.th', { id: '1', orderId: 'ORD-TH-1' });
  publish('order.created.us', { id: '2', orderId: 'ORD-US-1' });
  publish('order.shipped.th', { id: '3', orderId: 'ORD-TH-1' });
  publish('payment.failed.th', { id: '4' });

  await new Promise((r) => setTimeout(r, 500));
});
