# 04 — Async Task Pipeline

จำลอง flow: API รับคำสั่ง → RabbitMQ work queue → worker ประมวลผล → publish event ไป Kafka

```bash
node 02-intermediate/examples/04-async-task-pipeline/pipeline.js
```
