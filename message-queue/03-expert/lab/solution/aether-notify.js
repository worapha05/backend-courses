import amqp from 'amqplib';
import { RABBIT_URL, createKafka, ensureTopic, sleep } from '../../lib/connections.js';

const CMD_TOPIC = 'aether.notify.commands';
const CDC_TOPIC = 'aether.cdc.user-preferences';
const JOBS = 'aether.notify.jobs';
const DLQ = 'aether.notify.dlq';
const DLX = 'aether.notify.dlx';
const DELAYS = [
  { q: 'aether.notify.wait-1s', ttl: 1000 },
  { q: 'aether.notify.wait-2s', ttl: 2000 },
  { q: 'aether.notify.wait-4s', ttl: 4000 },
];

await ensureTopic(CMD_TOPIC, 6);
await ensureTopic(CDC_TOPIC, 3);

const kafka = createKafka('aether-notify');
const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });

await producer.connect();

const preferences = new Map();

const cdcConsumer = kafka.consumer({ groupId: 'aether-pref-projector' });

await cdcConsumer.connect();
await cdcConsumer.subscribe({ topic: CDC_TOPIC, fromBeginning: true });

let cdcGot = 0;
const cdcReady = new Promise((resolve) => {
  cdcConsumer.run({
    eachMessage: async ({ message }) => {
      const ev = JSON.parse(message.value.toString());
      const id = String(ev.after?.userId ?? ev.before?.userId);

      if (ev.op === 'd') {
        preferences.delete(id);
      } else if (ev.after) {
        preferences.set(id, {
          emailOptIn: ev.after.emailOptIn,
          pushOptIn: ev.after.pushOptIn,
          locale: ev.after.locale,
        });
      }

      cdcGot += 1;
      console.log('[cdc]', id, preferences.get(id));

      if (cdcGot >= 2) resolve();
    },
  });
});

await sleep(800);

await producer.send({
  topic: CDC_TOPIC,
  messages: [
    {
      key: 'U-1',
      value: JSON.stringify({
        op: 'c',
        after: { userId: 'U-1', emailOptIn: true, pushOptIn: true },
      }),
    },
    {
      key: 'U-2',
      value: JSON.stringify({
        op: 'c',
        after: {
          userId: 'U-2',
          emailOptIn: false,
          pushOptIn: true,
          locale: 'th-TH',
        },
      }),
    },
  ],
});

await Promise.race([cdcReady, sleep(8000)]);

const rmq = await amqp.connect(RABBIT_URL);
const setup = await rmq.createChannel();

await setup.assertExchange(DLX, 'direct', { durable: true });
await setup.assertQueue(DLQ, { durable: true });
await setup.bindQueue(DLQ, DLX, 'dlq');

const jobArgs = {
  'x-dead-letter-exchange': DLX,
  'x-dead-letter-routing-key': 'dlq',
};

try {
  await setup.assertQueue(JOBS, {
    durable: true,
    arguments: { ...jobArgs, 'x-queue-type': 'quorum' },
  });
  console.log('using quorum queue', JOBS);
} catch {
  await setup.assertQueue(JOBS, { durable: true, arguments: jobArgs });
  console.log('using classic durable queue', JOBS);
}

for (const d of DELAYS) {
  await setup.assertQueue(d.q, {
    durable: true,
    arguments: {
      'x-message-ttl': d.ttl,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': JOBS,
    },
  });
  await setup.purgeQueue(d.q);
}

await setup.purgeQueue(JOBS);
await setup.purgeQueue(DLQ);
await setup.close();

class CircuitBreaker {
  constructor() {
    this.failures = 0;
    this.state = 'closed';
    this.openedAt = 0;
  }

  canRequest() {
    if (this.state === 'closed') return true;

    if (this.state === 'open' && Date.now() - this.openedAt > 2000) {
      this.state = 'half-open';
      return true;
    }

    return this.state !== 'open';
  }

  success() {
    this.failures = 0;
    this.state = 'closed';
  }

  fail() {
    this.failures += 1;

    if (this.failures >= 2 || this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = Date.now();
      console.log('[circuit:email] OPEN');
    }
  }
}

const processedCommands = new Set();
const emailCircuit = new CircuitBreaker();
let emailProviderDown = true;

setTimeout(() => {
  emailProviderDown = false;
  console.log('[email provider] recovered');
}, 4000);

const sent = [];
const skipped = [];

async function startSenderWorker() {
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();

  await ch.prefetch(1);

  ch.consume(DLQ, (msg) => {
    if (!msg) return;

    console.log('[DLQ]', msg.content.toString());
    ch.ack(msg);
  });

  ch.consume(JOBS, async (msg) => {
    if (!msg) return;

    const job = JSON.parse(msg.content.toString());
    const attempt = job.attempt ?? 1;

    if (!job.userId || job.payload?.poison) {
      console.log('[worker] poison/invalid → DLQ', job.commandId);
      ch.nack(msg, false, false);
      return;
    }

    if (processedCommands.has(job.commandId)) {
      console.log('[worker] idempotent skip', job.commandId);
      ch.ack(msg);
      return;
    }

    const pref = preferences.get(job.userId) || {
      emailOptIn: true,
      pushOptIn: true,
    };

    if (job.channel === 'email' && pref.emailOptIn === false) {
      skipped.push(job.commandId);
      console.log('[worker] skip email opt-out', job.userId);
      processedCommands.add(job.commandId);
      ch.ack(msg);
      return;
    }

    if (job.channel === 'email' && !emailCircuit.canRequest()) {
      const idx = Math.min(attempt - 1, DELAYS.length - 1);

      ch.sendToQueue(DELAYS[idx].q, Buffer.from(JSON.stringify({ ...job, attempt: attempt + 1 })), {
        persistent: true,
      });
      ch.ack(msg);
      console.log('[worker] circuit open →', DELAYS[idx].q);
      return;
    }

    try {
      if (job.channel === 'email' && emailProviderDown) {
        throw new Error('provider down');
      }

      await sleep(40);

      if (job.channel === 'email') emailCircuit.success();

      processedCommands.add(job.commandId);
      sent.push(job.commandId);
      console.log('[worker] SENT', job.commandId, job.channel);
      ch.ack(msg);
    } catch (err) {
      if (job.channel === 'email') emailCircuit.fail();

      if (attempt >= 4) {
        console.log('[worker] max attempts → DLQ', job.commandId);
        ch.nack(msg, false, false);
        return;
      }

      const idx = Math.min(attempt - 1, DELAYS.length - 1);

      ch.sendToQueue(DELAYS[idx].q, Buffer.from(JSON.stringify({ ...job, attempt: attempt + 1 })), {
        persistent: true,
      });
      ch.ack(msg);
      console.log('[worker] backoff', DELAYS[idx].q, err.message);
    }
  });

  return { conn, ch };
}

const worker = await startSenderWorker();

const dispatcherConn = await amqp.connect(RABBIT_URL);
const dispatcherCh = await dispatcherConn.createChannel();

const dispatcher = kafka.consumer({ groupId: 'aether-dispatcher' });

await dispatcher.connect();
await dispatcher.subscribe({ topic: CMD_TOPIC, fromBeginning: true });

let dispatched = 0;
const expectDispatch = 4;
const dispatchDone = new Promise((resolve) => {
  const timer = setTimeout(resolve, 25000);

  dispatcher.run({
    eachMessage: async ({ message }) => {
      const cmd = JSON.parse(message.value.toString());

      dispatcherCh.sendToQueue(JOBS, Buffer.from(JSON.stringify(cmd)), {
        persistent: true,
        messageId: cmd.commandId,
      });

      dispatched += 1;
      console.log('[dispatcher] enqueued', cmd.commandId, 'lag_approx=', expectDispatch - dispatched);

      if (dispatched >= expectDispatch) {
        clearTimeout(timer);
        resolve();
      }
    },
  });
});

await sleep(1200);

async function postNotify(body) {
  await producer.send({
    topic: CMD_TOPIC,
    messages: [
      {
        key: body.userId,
        value: JSON.stringify(body),
        headers: { 'idempotency-key': Buffer.from(body.commandId) },
      },
    ],
  });

  return { status: 202, commandId: body.commandId };
}

console.log(
  await postNotify({
    commandId: 'cmd-1',
    userId: 'U-1',
    channel: 'email',
    template: 'otp',
    payload: { code: '111111' },
  }),
);

console.log(
  await postNotify({
    commandId: 'cmd-2',
    userId: 'U-2',
    channel: 'email',
    template: 'otp',
    payload: { code: '222222' },
  }),
);

console.log(
  await postNotify({
    commandId: 'cmd-3',
    userId: 'U-1',
    channel: 'email',
    template: 'otp',
    payload: { poison: true },
  }),
);

console.log(
  await postNotify({
    commandId: 'cmd-1',
    userId: 'U-1',
    channel: 'email',
    template: 'otp',
    payload: { code: '111111' },
  }),
);

await Promise.race([dispatchDone, sleep(15000)]);
await sleep(10000);

console.log('\n=== Summary ===');
console.log('sent:', sent);
console.log('skipped (opt-out):', skipped);
console.log('processedCommands:', [...processedCommands]);
console.log('preferences:', Object.fromEntries(preferences));

await producer.disconnect();
await dispatcher.disconnect();
await cdcConsumer.disconnect();
await dispatcherCh.close();
await dispatcherConn.close();
await worker.ch.close();
await worker.conn.close();
await rmq.close();

console.log('AetherNotify lab solution finished');
