# Prisma + NestJS Example

```bash
cp .env.example .env # ถ้ายังไม่มี .env
npm install
npx prisma db push # สร้างตาราง
npm run start:dev
```

## สลับไป PostgreSQL

1. ใน `prisma/schema.prisma` เปลี่ยน `provider = "postgresql"`
2. ตั้ง `DATABASE_URL` เป็น connection string ของ Postgres
3. รัน `npx prisma migrate dev --name init`
