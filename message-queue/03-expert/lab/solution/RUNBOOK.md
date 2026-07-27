# RUNBOOK — AetherNotify

## SLO ตัวอย่าง

| สัญญาณ                              | เป้าหมาย         | Alert                          |
| ----------------------------------- | ---------------- | ------------------------------ |
| Kafka lag กลุ่ม `aether-dispatcher` | < 1,000 messages | นาน > 5 นาที                   |
| RabbitMQ depth `aether.notify.jobs` | < 500            | นาน > 5 นาที และ consumers > 0 |
| DLQ depth `aether.notify.dlq`       | 0                | ทันทีเมื่อ > 0                 |
| Circuit `email` open                | ฟื้นใน 10 นาที   | เปิดต่อเนื่อง > 10 นาที        |

## เมื่อ DLQ > 0

1. ดึงตัวอย่าง message จาก DLQ (Management UI / consumer ชั่วคราว)
2. แยกประเภท: schema ผิด / poison / เกิน max attempts
3. แก้สาเหตุ (deploy fix หรือ แก้ข้อมูล)
4. Replay ทีละชุดอย่างควบคุม — **ห้าม** เทกลับหมดในครั้งเดียวถ้ายังไม่แน่ใจ
5. บันทึก postmortem สั้น ๆ

## เมื่อ Circuit Open > 10 นาที

1. ตรวจสถานะ email provider / DNS / credential
2. ยืนยันว่า retry queues ไม่ระเบิด memory (depth)
3. ถ้า provider ยังไม่กลับ — ประกาศ degraded mode, พิจารณาช่องทางสำรอง (push/SMS)
4. เมื่อ provider กลับ: half-open → ปล่อย traffic ทีละน้อย

## ประมาณ lag ใน lab

```text
approx_lag = produced_count - consumed_count
```

ใน production ใช้ Kafka Exporter + Prometheus:

```text
sum(kafka_consumergroup_lag{group="aether-dispatcher"})
```

หรือ Burrow สำหรับ consumer group status
