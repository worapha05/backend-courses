import { withRabbit, sleep } from '../../lib/connections.js';

await withRabbit(async (ch) => {
  const dlx = 'bootcamp.dlx';
  const mainQ = 'bootcamp.dlx.main';
  const deadQ = 'bootcamp.dlx.dead';
  const delayQ = 'bootcamp.dlx.delay';

  await ch.assertExchange(dlx, 'direct', { durable: true });
  await ch.assertQueue(deadQ, { durable: true });
  await ch.bindQueue(deadQ, dlx, 'dead');

  await ch.assertQueue(mainQ, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlx,
      'x-dead-letter-routing-key': 'dead',
    },
  });

  await ch.assertQueue(delayQ, {
    durable: true,
    arguments: {
      'x-message-ttl': 2000,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': mainQ,
    },
  });

  await ch.purgeQueue(mainQ);
  await ch.purgeQueue(deadQ);
  await ch.purgeQueue(delayQ);

  ch.consume(mainQ, (msg) => {
    if (!msg) return;

    const body = JSON.parse(msg.content.toString());
    const attempt = body.attempt ?? 1;

    console.log(`[main] got id=${body.id} attempt=${attempt}`);

    if (body.id === 'poison') {
      console.log('[main] poison → nack to DLX');
      ch.nack(msg, false, false);
      return;
    }

    if (attempt < 2) {
      const retry = { ...body, attempt: attempt + 1 };

      ch.sendToQueue(delayQ, Buffer.from(JSON.stringify(retry)), {
        persistent: true,
      });
      ch.ack(msg);
      console.log('[main] scheduled retry via delay queue');
      return;
    }

    console.log('[main] success', body.id);
    ch.ack(msg);
  });

  ch.consume(deadQ, (msg) => {
    if (!msg) return;

    console.log('[DLQ]', msg.content.toString());
    console.log(' x-death:', msg.properties.headers?.['x-death']);
    ch.ack(msg);
  });

  ch.sendToQueue(mainQ, Buffer.from(JSON.stringify({ id: 'job-1', attempt: 1 })), {
    persistent: true,
  });

  ch.sendToQueue(mainQ, Buffer.from(JSON.stringify({ id: 'poison' })), {
    persistent: true,
  });

  console.log('waiting for retry (~2s) and DLQ...');
  await sleep(5000);
});

console.log('dlx-demo done');
