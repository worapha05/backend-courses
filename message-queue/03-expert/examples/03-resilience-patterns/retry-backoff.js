import { withRabbit, sleep } from '../../lib/connections.js';

class CircuitBreaker {
  constructor({ failureThreshold = 3, resetMs = 2000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetMs = resetMs;
    this.failures = 0;
    this.state = 'closed';
    this.openedAt = 0;
  }

  canRequest() {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.resetMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure() {
    this.failures += 1;

    if (this.failures >= this.failureThreshold || this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = Date.now();
      console.log('[circuit] OPEN');
    }
  }
}

await withRabbit(async (ch) => {
  const dlx = 'bootcamp.resilience.dlx';
  const main = 'bootcamp.resilience.main';
  const dlq = 'bootcamp.resilience.dlq';
  const delays = [
    { q: 'bootcamp.resilience.wait-1s', ttl: 1000 },
    { q: 'bootcamp.resilience.wait-2s', ttl: 2000 },
    { q: 'bootcamp.resilience.wait-4s', ttl: 4000 },
  ];

  await ch.assertExchange(dlx, 'direct', { durable: true });
  await ch.assertQueue(dlq, { durable: true });
  await ch.bindQueue(dlq, dlx, 'dlq');

  await ch.assertQueue(main, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlx,
      'x-dead-letter-routing-key': 'dlq',
    },
  });

  for (const d of delays) {
    await ch.assertQueue(d.q, {
      durable: true,
      arguments: {
        'x-message-ttl': d.ttl,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': main,
      },
    });
    await ch.purgeQueue(d.q);
  }

  await ch.purgeQueue(main);
  await ch.purgeQueue(dlq);
  await ch.prefetch(1);

  const breaker = new CircuitBreaker({ failureThreshold: 2, resetMs: 1500 });
  let dependencyDown = true;

  setTimeout(() => {
    dependencyDown = false;
    console.log('[dependency] recovered');
  }, 3500);

  const maxAttempts = 4;

  ch.consume(dlq, (msg) => {
    if (!msg) return;

    console.log('[DLQ]', msg.content.toString());
    ch.ack(msg);
  });

  ch.consume(main, async (msg) => {
    if (!msg) return;

    const body = JSON.parse(msg.content.toString());
    const attempt = body.attempt ?? 1;

    console.log(`[main] ${body.id} attempt=${attempt} circuit=${breaker.state}`);

    if (body.poison) {
      ch.nack(msg, false, false);
      return;
    }

    if (!breaker.canRequest()) {
      const idx = Math.min(attempt - 1, delays.length - 1);

      ch.sendToQueue(delays[idx].q, Buffer.from(JSON.stringify({ ...body, attempt: attempt + 1 })), {
        persistent: true,
      });
      ch.ack(msg);
      console.log('[main] circuit open → backoff', delays[idx].q);
      return;
    }

    try {
      if (dependencyDown) throw new Error('smtp unavailable');

      await sleep(50);
      breaker.recordSuccess();
      ch.ack(msg);
      console.log('[main] SUCCESS', body.id);
    } catch (err) {
      breaker.recordFailure();

      if (attempt >= maxAttempts) {
        console.log('[main] max attempts → DLQ', body.id);
        ch.nack(msg, false, false);
        return;
      }

      const idx = Math.min(attempt - 1, delays.length - 1);

      ch.sendToQueue(delays[idx].q, Buffer.from(JSON.stringify({ ...body, attempt: attempt + 1 })), {
        persistent: true,
      });
      ch.ack(msg);
      console.log('[main] fail →', delays[idx].q, err.message);
    }
  });

  ch.sendToQueue(main, Buffer.from(JSON.stringify({ id: 'mail-1', attempt: 1 })), {
    persistent: true,
  });

  ch.sendToQueue(main, Buffer.from(JSON.stringify({ id: 'poison-1', poison: true })), {
    persistent: true,
  });

  await sleep(12000);
});

console.log('resilience demo done');
