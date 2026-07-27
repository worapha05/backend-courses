# 02 — RabbitMQ Exchanges

ตัวอย่าง Direct / Fanout / Topic กับ RabbitMQ จริง

```bash
# ต้อง docker compose up -d ก่อน
node 01-beginner/examples/02-rabbitmq-exchanges/direct.js
node 01-beginner/examples/02-rabbitmq-exchanges/fanout.js
node 01-beginner/examples/02-rabbitmq-exchanges/topic.js

# Python (optional)
pip install pika
python3 01-beginner/examples/02-rabbitmq-exchanges/direct.py
```

เปิด Management UI: http://localhost:15672 (`bootcamp` / `bootcamp`) แล้วดู Exchanges / Queues
