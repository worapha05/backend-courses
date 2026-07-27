class SimpleQueue {
  constructor(name) {
    this.name = name;
    this.messages = [];
  }

  publish(msg) {
    this.messages.push(msg);
    console.log(`[Queue:${this.name}] enqueued`, msg.id);
  }

  consume() {
    const msg = this.messages.shift();

    if (msg) {
      console.log(`[Queue:${this.name}] consumed`, msg.id);
    }

    return msg ?? null;
  }
}

class SimpleStream {
  constructor(name) {
    this.name = name;
    this.log = [];
  }

  publish(msg) {
    const offset = this.log.length;

    this.log.push(msg);
    console.log(`[Stream:${this.name}] appended offset=${offset}`, msg.id);

    return offset;
  }

  readFrom(offset = 0) {
    return this.log.slice(offset).map((msg, i) => ({
      offset: offset + i,
      msg,
    }));
  }
}

const order = { id: 'evt-1', type: 'order.created', data: { orderId: 'ORD-1' } };

console.log('\n=== Message Queue model ===');
const q = new SimpleQueue('jobs');
q.publish(order);
q.publish({ id: 'evt-2', type: 'order.created', data: { orderId: 'ORD-2' } });
q.consume();
q.consume();
console.log('remaining in queue:', q.messages.length);

console.log('\n=== Event Stream model ===');
const s = new SimpleStream('orders');
s.publish(order);
s.publish({ id: 'evt-2', type: 'order.paid', data: { orderId: 'ORD-1' } });

const billing = s.readFrom(0);
const analytics = s.readFrom(0);

console.log('billing saw', billing.length, 'events');
console.log('analytics saw', analytics.length, 'events (replay ได้)');
console.log('stream length still:', s.log.length);

console.log(`
สรุป:
- Queue = "ใครทำงานนี้" (หายหลัง consume)
- Stream = "เกิดอะไรขึ้น" (เก็บ + อ่านซ้ำได้หลายกลุ่ม)
`);
