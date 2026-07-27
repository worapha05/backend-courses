# 01 — Dead Letter Exchange & TTL

สาธิตการ reject message แล้วให้ไป DLQ และใช้ TTL เป็น delay

```bash
node 02-intermediate/examples/01-rabbitmq-dlx-ttl/dlx-demo.js
```

หลังรัน เปิด http://localhost:15672 ดูคิว `bootcamp.dlx.dead` และ headers ของ dead letter
