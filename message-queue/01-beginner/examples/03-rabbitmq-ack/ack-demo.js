import { withRabbit, sleep } from '../../lib/connections.js';

await withRabbit(async (ch) => {
  const q = 'bootcamp.ack.demo';

  await ch.assertQueue(q, { durable: true });
  await ch.purgeQueue(q);

  for (const id of ['ok-1', 'fail-temp-2', 'ok-3']) {
    ch.sendToQueue(q, Buffer.from(JSON.stringify({ id, task: 'process' })), {
      persistent: true,
      messageId: id,
    });
  }
  console.log('enqueued 3 messages');

  await ch.prefetch(1);

  let processed = 0;
  const seenFail = new Set();

  await new Promise((resolve) => {
    ch.consume(q, async (msg) => {
      if (!msg) return;

      const body = JSON.parse(msg.content.toString());
      console.log('got', body.id);

      try {
        if (body.id.startsWith('fail-temp') && !seenFail.has(body.id)) {
          seenFail.add(body.id);
          throw new Error('simulated transient failure');
        }

        await sleep(100);
        ch.ack(msg);
        console.log('ACK', body.id);

        processed += 1;
        if (processed >= 3) resolve();
      } catch (err) {
        console.log('NACK requeue', body.id, '-', err.message);
        ch.nack(msg, false, true);
      }
    }, { noAck: false });
  });
});

console.log('done');
