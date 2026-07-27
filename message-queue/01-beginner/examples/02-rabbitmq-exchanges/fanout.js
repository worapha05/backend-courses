import { withRabbit } from '../../lib/connections.js';

await withRabbit(async (ch) => {
  const exchange = 'bootcamp.fanout.notifications';

  await ch.assertExchange(exchange, 'fanout', { durable: true });

  const email = await ch.assertQueue('bootcamp.notify.email', { durable: true });
  const sms = await ch.assertQueue('bootcamp.notify.sms', { durable: true });
  const push = await ch.assertQueue('bootcamp.notify.push', { durable: true });

  for (const q of [email, sms, push]) {
    await ch.bindQueue(q.queue, exchange, '');
  }

  for (const q of [email, sms, push]) {
    ch.consume(q.queue, (msg) => {
      if (!msg) return;

      console.log(`[${q.queue}]`, msg.content.toString());
      ch.ack(msg);
    });
  }

  const event = {
    id: 'ntf-1',
    type: 'user.registered',
    data: { email: 'ada@example.com', phone: '+6681...' },
  };

  ch.publish(exchange, '', Buffer.from(JSON.stringify(event)), {
    contentType: 'application/json',
    persistent: true,
  });

  console.log('fanout published');

  await new Promise((r) => setTimeout(r, 500));
});
