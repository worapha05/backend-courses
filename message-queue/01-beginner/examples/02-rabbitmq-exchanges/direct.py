import json
import pika

creds = pika.PlainCredentials("bootcamp", "bootcamp")
params = pika.ConnectionParameters("localhost", 5672, "/", creds)
conn = pika.BlockingConnection(params)
ch = conn.channel()

exchange = "bootcamp.direct"

ch.exchange_declare(exchange=exchange, exchange_type="direct", durable=True)
ch.queue_declare(queue="bootcamp.payments", durable=True)
ch.queue_bind("bootcamp.payments", exchange, routing_key="order.payments")

body = {"id": "py-1", "type": "charge", "amount": 99}

ch.basic_publish(
    exchange=exchange,
    routing_key="order.payments",
    body=json.dumps(body),
    properties=pika.BasicProperties(
        content_type="application/json",
        delivery_mode=2,
        message_id=body["id"],
    ),
)

print("published", body)
conn.close()
