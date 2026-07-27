import amqp from 'amqplib';
import { Kafka, logLevel } from 'kafkajs';

export const RABBIT_URL = process.env.RABBIT_URL || 'amqp://bootcamp:bootcamp@localhost:5672';

export const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export async function withRabbit(fn) {
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();

  try {
    return await fn(ch, conn);
  } finally {
    await ch.close().catch(() => {});
    await conn.close().catch(() => {});
  }
}

export function createKafka(clientId = 'mq-bootcamp') {
  return new Kafka({
    clientId,
    brokers: KAFKA_BROKERS,
    logLevel: logLevel.ERROR,
    retry: { initialRetryTime: 300, retries: 8 },
  });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function ensureTopic(topic, numPartitions = 3, replicationFactor = 1) {
  const kafka = createKafka('mq-admin');
  const admin = kafka.admin();

  await admin.connect();

  try {
    const existing = await admin.listTopics();

    if (!existing.includes(topic)) {
      await admin.createTopics({
        topics: [{ topic, numPartitions, replicationFactor }],
        waitForLeaders: true,
      });

      console.log(`created topic: ${topic} (partitions=${numPartitions})`);
    }
  } finally {
    await admin.disconnect();
  }
}
