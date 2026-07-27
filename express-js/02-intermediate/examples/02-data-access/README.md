# 02 — Data Access (Prisma + Knex)

ตัวอย่างนี้แสดง **สองแนวทาง** เข้าถึงข้อมูล:

1. **Prisma** — schema + client (SQLite ไฟล์ เพื่อรันง่าย)
2. **Knex** — query builder กับ PostgreSQL (ใช้เมื่อมี Docker)

## Prisma (SQLite)

```bash
cd nodejs-express-bootcamp
npx prisma generate --schema=02-intermediate/examples/02-data-access/prisma/schema.prisma
npx prisma migrate dev --name init --schema=02-intermediate/examples/02-data-access/prisma/schema.prisma
node 02-intermediate/examples/02-data-access/src/prisma-demo.js
```

ตั้ง env (หรือใช้ค่า default ใน schema):

```bash
export DATABASE_URL="file:./dev.db"
```

## Knex (PostgreSQL)

```bash
npm run docker:up
export DATABASE_URL=postgresql://bootcamp:bootcamp@localhost:5432/express_bootcamp
node 02-intermediate/examples/02-data-access/src/knex-migrate.js
node 02-intermediate/examples/02-data-access/src/knex-demo.js
```
