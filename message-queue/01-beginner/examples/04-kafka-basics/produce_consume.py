import json
from confluent_kafka import Producer

p = Producer({"bootstrap.servers": "localhost:9092"})


def delivery(err, msg):
    if err:
        print("fail", err)
    else:
        print(f"ok topic={msg.topic()} partition={msg.partition()} offset={msg.offset()}")


for i in range(3):
    body = {"id": f"py-ord-{i}", "type": "order.created"}
    p.produce(
        "bootcamp.orders",
        key=body["id"],
        value=json.dumps(body),
        callback=delivery,
    )

p.flush()
print("produced 3 messages")
