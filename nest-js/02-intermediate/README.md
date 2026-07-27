# Level 2 — Intermediate: Request Pipeline & Databases

เป้าหมายระดับนี้: ให้คุณควบคุม **ทั้งเส้นทางของ Request** ตั้งแต่ validate input → เข้า DB ผ่าน
Prisma → จัดรูปแบบ response / จัดการ error อย่างเป็นระบบ

---

## สารบัญ

1. [Request Lifecycle ใน NestJS](#1-request-lifecycle-ใน-nestjs)
2. [Input Validation ด้วย ValidationPipe](#2-input-validation-ด้วย-validationpipe)
3. [Data Access: Prisma ORM + PostgreSQL](#3-data-access-prisma-orm--postgresql)
4. [Exception Filters, Interceptors และ Custom Pipes](#4-exception-filters-interceptors-และ-custom-pipes)
5. [Design Patterns ในระดับ Intermediate](#5-design-patterns-ในระดับ-intermediate)
6. [Best Practices สรุป](#6-best-practices-สรุป)

---

## 1. Request Lifecycle ใน NestJS

ลำดับจริงของ request (สรุป):

```
Incoming Request
 → Middleware
 → Guards
 → Interceptors (pre)
 → Pipes (validation / transform)
 → Controller → Service
 → Interceptors (post)
 → Exception Filters (ถ้ามี error)
 → Response
```

| ชิ้นส่วน         | หน้าที่หลัก                    | OOP มุมมอง                         |
| ---------------- | ------------------------------ | ---------------------------------- |
| Guard            | อนุญาต/ปฏิเสธ (authN/authZ)    | Strategy / Chain of Responsibility |
| Pipe             | แปลง + validate input          | Transformer                        |
| Interceptor      | ครอบก่อน/หลัง handler (AOP)    | Decorator / Proxy                  |
| Exception Filter | แปลง exception → HTTP response | Adapter                            |

ระดับ Intermediate โฟกัส **Pipe / Filter / Interceptor + Prisma** Guards เชิงลึกจะไปต่อที่ Expert
(RBAC)

---

## 2. Input Validation ด้วย ValidationPipe

### 2.1 ทำไมต้อง validate ที่ขอบ (Edge)

อย่าเชื่อ client — ทุก body/query เป็น untrusted input

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // ตัด property ที่ไม่มีใน DTO
    forbidNonWhitelisted: true, // ถ้ามี field แปลก → 400
    transform: true, // แปลง type ตาม DTO (ต้องมี class-transformer)
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### 2.2 DTO ด้วย class-validator

```ts
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  author!: string;

  @IsInt()
  @Min(0)
  pages!: number;
}
```

**สำคัญ:** DTO ต้องเป็น **class** ไม่ใช่ interface — เพราะ decorator metadata ทำงานกับ class
เท่านั้น

ดูตัวอย่างรันได้: [`examples/01-validation-pipe/`](./examples/01-validation-pipe/)

---

## 3. Data Access: Prisma ORM + PostgreSQL

### 3.1 ทำไมเลือก Prisma ในหลักสูตรนี้

| ข้อดี            | ความหมาย                             |
| ---------------- | ------------------------------------ |
| Schema-first     | `schema.prisma` เป็น source of truth |
| Type-safe client | generate types จาก schema            |
| Migrations       | เปลี่ยน schema อย่างมีประวัติ        |

> TypeORM ก็ใช้ได้ในองค์กร — แนวคิดเดียวกันคือ **Repository / Unit of Work** หลักสูตรเลือก Prisma
> เพราะ DX และ type generation ชัดสำหรับ self-learning

### 3.2 PrismaService ใน Nest

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Lifecycle hooks ของ Nest (`OnModuleInit`) = ที่ถูกต้องสำหรับเปิด connection

### 3.3 PostgreSQL setup (Docker)

```bash
docker run --name nest-bootcamp-pg \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=nest_bootcamp \
  -p 5432:5432 -d postgres:16
```

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/nest_bootcamp?schema=public"
```

ดูตัวอย่างรันได้: [`examples/02-prisma-postgresql/`](./examples/02-prisma-postgresql/)
(ตัวอย่างนี้รองรับ SQLite สำหรับเรียนเร็ว และมี schema แบบ PostgreSQL ในคอมเมนต์)

---

## 4. Exception Filters, Interceptors และ Custom Pipes

### 4.1 Exception Filter — แปลง error เป็น contract เดียวกัน

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // map → { success: false, statusCode, message, path, timestamp }
  }
}
```

เมื่อใช้ Prisma ให้ map `PrismaClientKnownRequestError` ด้วย เช่น:

| Prisma code         | HTTP ที่ควรส่ง  |
| ------------------- | --------------- |
| `P2002` (unique)    | `409 Conflict`  |
| `P2025` (not found) | `404 Not Found` |

ถ้าปล่อยผ่าน จะกลายเป็น `500` ทั้งที่จริง ๆ เป็น client error

### 4.2 Interceptor — Response Envelope / Timing

```ts
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

นี่คือ **Aspect-Oriented Programming (AOP)** — cross-cutting concern ไม่ปนในทุก controller

### 4.3 Custom Pipe — Parse / Normalize

```ts
@Injectable()
export class ParseSkuPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const sku = value.trim().toUpperCase();
    if (!/^SKU-[A-Z0-9]+$/.test(sku)) {
      throw new BadRequestException('Invalid SKU format');
    }
    return sku;
  }
}
```

ดูตัวอย่างรันได้:
[`examples/03-filters-interceptors-pipes/`](./examples/03-filters-interceptors-pipes/)

---

## 5. Design Patterns ในระดับ Intermediate

| Pattern                     | การใช้                             |
| --------------------------- | ---------------------------------- |
| **DTO Pattern**             | class + validators ที่ boundary    |
| **Repository**              | PrismaService / repository wrapper |
| **Unit of Work**            | Prisma `$transaction`              |
| **Interceptor (AOP)**       | logging, transform, timing         |
| **Chain of Responsibility** | pipes / filters ใน pipeline        |
| **Adapter**                 | Exception → HTTP JSON contract     |

```
HTTP → Pipe(validate) → Controller → Service → Prisma (DB)
   ↑    ↓
  Filter ←——— throw ———— Interceptor wraps success
```

---

## 6. Best Practices สรุป

1. **Global ValidationPipe เสมอ** ใน production API
2. **whitelist + forbidNonWhitelisted** — กัน mass assignment
3. **อย่าส่ง Prisma model ตรง ๆ ออก HTTP** — map เป็น response DTO เมื่อ schema ซับซ้อน
4. **Exception Filter รวมรูปแบบ error** ให้ frontend คาดเดาได้
5. **Interceptor สำหรับ cross-cutting** ไม่ copy `return { data }` ทุก method
6. **PrismaService เป็น singleton** ใน `PrismaModule` ที่ `Global` หรือ export ชัดเจน

---

## แบบฝึกหัดก่อนทำ Lab

1. อธิบายทำไม interface ใช้เป็น DTO กับ ValidationPipe ไม่ได้
2. วาดลำดับ Guard → Interceptor → Pipe → Handler ของ `POST /books`
3. เขียน `CreateBookDto` ที่มี `@IsISBN()` หรือ regex สำหรับ ISBN

เมื่อพร้อม → ไปที่ [`LAB.md`](./LAB.md)
