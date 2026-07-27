# Lab — Intermediate: Library API Pipeline

## เป้าหมาย

สร้าง Library API ที่ผ่าน **ValidationPipe + Prisma + Exception Filter + Response Interceptor +
Custom Pipe** จำลอง enterprise request pipeline ครบวงจร

## โจทย์

สร้าง NestJS API สำหรับยืมหนังสือในห้องสมุด

### Endpoints

| Method | Path                    | คำอธิบาย                               |
| ------ | ----------------------- | -------------------------------------- |
| `POST` | `/members`              | สมัครสมาชิก                            |
| `GET`  | `/members`              | รายชื่อสมาชิก                          |
| `POST` | `/titles`               | เพิ่มชื่อหนังสือ (title catalog)       |
| `GET`  | `/titles`               | รายการหนังสือ                          |
| `POST` | `/loans`                | ยืมหนังสือ                             |
| `POST` | `/loans/:loanId/return` | คืนหนังสือ                             |
| `GET`  | `/loans`                | รายการยืม (`?status=active\|returned`) |

### DTO ที่ต้อง validate

**CreateMemberDto**

- `email`: email ถูกต้อง
- `fullName`: string ยาวอย่างน้อย 2

**CreateTitleDto**

- `isbn`: ตรงรูปแบบ `^\d{13}$` (ใช้ `@Matches`)
- `name`: string ยาวอย่างน้อย 2
- `copies`: int ≥ 1

**CreateLoanDto**

- `memberId`: string (cuid)
- `titleId`: string (cuid)

### Business Rules

1. ยืมได้เฉพาะเมื่อ `availableCopies > 0`
2. เมื่อยืม → `availableCopies -= 1` และสร้าง loan `status=active`
3. เมื่อคืน → `availableCopies += 1` และ `status=returned`
4. ห้ามคืน loan ที่คืนแล้วแล้ว (`BadRequestException`)
5. ใช้ Prisma `$transaction` สำหรับยืม/คืน

### Pipeline ที่บังคับ

1. **Global `ValidationPipe`** — whitelist + forbidNonWhitelisted + transform
2. **`AllExceptionsFilter`** — response error รูป:

```json
{ "success": false, "statusCode": 400, "message": "...", "path": "...", "timestamp": "..." }
```

3. **`ResponseTransformInterceptor`** — success รูป:

```json
{ "success": true, "data": ..., "timestamp": "..." }
```

4. **Custom `ParseCuidPipe`** สำหรับ path param ที่เป็น id (อย่างน้อยตรวจว่าไม่ใช่ค่าว่างและยาว
   ≥ 10)

### Prisma Schema (แนวทาง)

ใช้ SQLite ได้สำหรับ lab (หรือ PostgreSQL ก็ได้)

```prisma
model Member {
  id        String   @id @default(cuid())
  email     String   @unique
  fullName  String
  loans     Loan[]
  createdAt DateTime @default(now())
}

model Title {
  id              String   @id @default(cuid())
  isbn            String   @unique
  name            String
  copies          Int
  availableCopies Int
  loans           Loan[]
  createdAt       DateTime @default(now())
}

model Loan {
  id         String    @id @default(cuid())
  memberId   String
  titleId    String
  status     String
  borrowedAt DateTime  @default(now())
  returnedAt DateTime?
  member     Member    @relation(fields: [memberId], references: [id])
  title      Title     @relation(fields: [titleId], references: [id])
}
```

### ตัวอย่างการเรียก

```bash
curl -X POST http://localhost:3110/members \
  -H 'Content-Type: application/json' \
  -d '{"email":"ann@corp.com","fullName":"Ann"}'

curl -X POST http://localhost:3110/titles \
  -H 'Content-Type: application/json' \
  -d '{"isbn":"9780132350884","name":"Clean Code","copies":2}'

curl -X POST http://localhost:3110/loans \
  -H 'Content-Type: application/json' \
  -d '{"memberId":"...","titleId":"..."}'
```

## เกณฑ์ผ่าน

- [ ] DTO validation ทำงาน (ส่ง field แปลกแล้วได้ 400)
- [ ] Prisma models + PrismaService lifecycle ถูกต้อง
- [ ] ยืม/คืนใช้ transaction และ update `availableCopies`
- [ ] Filter + Interceptor ให้ response contract เดียวกัน
- [ ] Unique ซ้ำ (email/isbn) ได้ `409` ไม่ใช่ `500` (map Prisma `P2002`)
- [ ] มี custom pipe สำหรับ id param

## คำใบ้

- `availableCopies` ตั้งค่าเริ่มต้น = `copies` ตอน create title
- ใน transaction อ่าน title ด้วย `findUnique` แล้วเช็กก่อน update
- ใส่ Filter/Interceptor ที่ `main.ts` แบบ global

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
cp .env.example .env
npm install
npx prisma db push
npm run start:dev
# port 3110
```
