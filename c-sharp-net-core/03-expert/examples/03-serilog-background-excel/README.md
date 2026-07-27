# Example 03 — Serilog, Background Export, ClosedXML

```bash
dotnet run
```

1. `POST /api/exports` → `202 Accepted` พร้อม `jobId`
2. BackgroundService ประมวลผลคิว → เขียนไฟล์ `.xlsx` ลง `exports/`
3. `GET /api/exports/{jobId}` เช็กสถานะ / download
4. ดู audit log ใน console และ `logs/audit-*.log`
