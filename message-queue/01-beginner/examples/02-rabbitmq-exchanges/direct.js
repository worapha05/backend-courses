import { withRabbit } from '../../lib/connections.js';

await withRabbit(async (ch) => {
  const exchange = 'bootcamp.direct';

  await ch.assertExchange(exchange, 'direct', { durable: true });

  const payments = await ch.assertQueue('bootcamp.payments', { durable: true });
  const shipping = await ch.assertQueue('bootcamp.shipping', { durable: true });

  await ch.bindQueue(payments.queue, exchange, 'order.payments');
  await ch.bindQueue(shipping.queue, exchange, 'order.shipping');

  ch.consume(payments.queue, (msg) => {
    if (!msg) return;

    console.log('[payments]', msg.content.toString());
    ch.ack(msg);
  });

  ch.consume(shipping.queue, (msg) => {
    if (!msg) return;

    console.log('[shipping]', msg.content.toString());
    ch.ack(msg);
  });

  const send = (key, body) => {
    ch.publish(exchange, key, Buffer.from(JSON.stringify(body)), {
      contentType: 'application/json',
      persistent: true,
      messageId: body.id,
    });

    console.log('published →', key, body.id);
  };

  send('order.payments', { id: 'm1', type: 'charge', amount: 500 });
  send('order.shipping', { id: 'm2', type: 'ship', tracking: 'TH123' });
  send('order.unknown', { id: 'm3', type: 'noop' });

  await new Promise((r) => setTimeout(r, 500));
});

console.log('done');
