# Level 1 — Beginner: NestJS Building Blocks

เป้าหมายระดับนี้: ให้คุณเข้าใจ **Modular Architecture + DI/IoC** ของ NestJS ไม่ใช่แค่สร้าง CRUD เร็ว
ๆ — แต่เข้าใจว่าทำไม framework ถึงบังคับโครงสร้างแบบนี้

---

## สารบัญ

1. [ทำไม NestJS ถึงเป็น OOP Framework](#1-ทำไม-nestjs-ถึงเป็น-oop-framework)
2. [Modular Architecture: Module / Controller / Provider](#2-modular-architecture-module--controller--provider)
3. [Dependency Injection และ Inversion of Control](#3-dependency-injection-และ-inversion-of-control)
4. [HTTP Requests: Params, Query, Body](#4-http-requests-params-query-body)
5. [Design Patterns ในระดับ Beginner](#5-design-patterns-ในระดับ-beginner)
6. [Best Practices สรุป](#6-best-practices-สรุป)

---

## 1. ทำไม NestJS ถึงเป็น OOP Framework

NestJS ถูกออกแบบมาให้ Backend มีโครงสร้างคล้าย **Spring (Java)** และ **Angular**:

| แนวคิด                     | ความหมาย                                |
| -------------------------- | --------------------------------------- |
| Class-based                | ทุกอย่างเป็น class ที่ติด decorator     |
| Composition over spaghetti | รวมชิ้นส่วนผ่าน Module ไม่ copy logic   |
| Testable by default        | DI ทำให้ mock dependency ได้ง่าย        |
| Explicit boundaries        | Module กำหนดว่าอะไร export / import ได้ |

```
┌─────────────────────────────────────────────────────┐
│   AppModule   │
│ imports: [ProductsModule, UsersModule]  │
└──────────────┬──────────────────┬───────────────────┘
  │   │
  ▼   ▼
 ┌────────────────┐ ┌────────────────┐
 │ ProductsModule │ │ UsersModule │
 │ Controller │ │ Controller │
 │ Service │ │ Service │
 └────────────────┘ └────────────────┘
```

ถ้าเขียน Express แบบ "ไฟล์เดียวเต็มไปด้วย route" จะ scale ไม่ได้ในทีมใหญ่ Nest บังคับให้แยก **รับ
request / business logic / wiring** ออกจากกันตั้งแต่แรก

ดูตัวอย่างรันได้: [`examples/01-modular-architecture/`](./examples/01-modular-architecture/)

---

## 2. Modular Architecture: Module / Controller / Provider

### 2.1 `@Module` — ขอบเขตของ Feature

```ts
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // module อื่น import แล้วใช้ได้
})
export class ProductsModule {}
```

| property      | หน้าที่                                      |
| ------------- | -------------------------------------------- |
| `imports`     | นำ Module อื่นมาใช้ (และของที่เขา `exports`) |
| `controllers` | HTTP entry points ของ module นี้             |
| `providers`   | class ที่ใส่ใน IoC container                 |
| `exports`     | providers ที่อนุญาตให้ module อื่นเห็น       |

**OOP มุมมอง:** Module = package / bounded context ของ feature

### 2.2 `@Controller` — รับ HTTP ไม่เขียน Business Logic

```ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }
}
```

Controller ควรทำแค่:

1. แปลง HTTP → method call
2. ส่งต่อให้ Service
3. คืนผลลัพธ์ (หรือปล่อยให้ Interceptor จัดรูปในระดับถัดไป)

### 2.3 `@Injectable` Provider / Service — ที่อยู่ของ Business Logic

```ts
@Injectable()
export class ProductsService {
  findAll(): Product[] {
    return [{ id: '1', name: 'Keyboard', price: 1200 }];
  }
}
```

**กฎทอง:** Controller ไม่รู้จัก DB โดยตรง — Service เป็นเจ้าของ use-case

---

## 3. Dependency Injection และ Inversion of Control

### 3.1 ปัญหาของ `new` เอง (Tight Coupling)

```ts
// ❌ Controller สร้าง dependency เอง — ทดสอบยาก / เปลี่ยน implementation ยาก
class ProductsController {
  private service = new ProductsService();
}
```

### 3.2 DI = คุณประกาศสิ่งที่ต้องการ, IoC = Framework ฉีดให้

```ts
// ✅ ขอ dependency ผ่าน constructor — Nest inject ให้
constructor(private readonly productsService: ProductsService) {}
```

```
คุณเขียน: "ฉันต้องการ ProductsService"
Nest ทำ: สร้าง instance (singleton เป็นค่าเริ่มต้น) แล้วส่งเข้า constructor
```

นี่คือ **Inversion of Control** — คุณไม่ควบคุมการสร้าง object อีกต่อไป Framework เป็นคนควบคุม
lifecycle

### 3.3 Provider Tokens และ Custom Providers

```ts
// Class token (ที่ใช้บ่อยสุด)
providers: [ProductsService];

// Custom token — พร้อมสำหรับ interface / config
providers: [
  { provide: 'APP_CONFIG', useValue: { port: 3000 } },
  { provide: PRODUCTS_REPO, useClass: InMemoryProductsRepository },
];
```

ดูตัวอย่างรันได้: [`examples/02-dependency-injection/`](./examples/02-dependency-injection/)

### 3.4 Scope ของ Provider

| Scope                 | พฤติกรรม                    | ใช้เมื่อ                       |
| --------------------- | --------------------------- | ------------------------------ |
| `DEFAULT` (singleton) | instance เดียวทั้งแอป       | Service ทั่วไป                 |
| `REQUEST`             | สร้างใหม่ต่อ request        | ต้องการ request-scoped context |
| `TRANSIENT`           | สร้างใหม่ทุกครั้งที่ inject | state ที่ไม่ควรแชร์            |

ระดับ Beginner ใช้ singleton ให้ชินก่อน — REQUEST/TRANSIENT จะกลับมาที่ Expert (multi-tenant)

---

## 4. HTTP Requests: Params, Query, Body

### 4.1 Route Parameters

```ts
@Get(':id')
findOne(@Param('id') id: string) {
  return this.productsService.findOne(id);
}
```

### 4.2 Query Strings แบบ Custom

```ts
@Get()
findAll(
  @Query('q') q?: string,
  @Query('minPrice') minPrice?: string,
  @Query('sort') sort: 'asc' | 'desc' = 'asc',
) {
  return this.productsService.search({ q, minPrice: Number(minPrice), sort });
}
```

### 4.3 Body และ HTTP Methods

```ts
@Post()
create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}

@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
  return this.productsService.update(id, dto);
}
```

> หมายเหตุ: ในระดับ Beginner เรายังไม่บังคับ `ValidationPipe` ระดับ Intermediate จะทำให้ DTO
> ปลอดภัยด้วย `class-validator`

ดูตัวอย่างรันได้: [`examples/03-http-routing/`](./examples/03-http-routing/)

---

## 5. Design Patterns ในระดับ Beginner

| Pattern                  | ใน NestJS Beginner               |
| ------------------------ | -------------------------------- |
| **Module Pattern**       | `@Module` แบ่ง feature           |
| **Dependency Injection** | constructor injection            |
| **Facade**               | Service เป็น facade ของ use-case |
| **Decorator**            | `@Get`, `@Param`, `@Injectable`  |
| **Singleton**            | default provider scope           |

```
Client → Controller (Adapter) → Service (Application) → Data (ยังเป็น in-memory)
```

แม้ยังไม่มี DB จริง โครงสร้างนี้คือรากฐานของ Clean Architecture ในระดับ Expert

---

## 6. Best Practices สรุป

1. **หนึ่ง feature = หนึ่ง Module** — อย่าใส่ทุกอย่างใน `AppModule`
2. **Controller บาง, Service หนา** — HTTP ไม่ใช่ business rule
3. **Inject ผ่าน constructor** — ห้าม `new Service()` ใน business code
4. **ตั้งชื่อชัด** — `ProductsService.findAll()` ไม่ใช่ `doStuff()`
5. **Type ทุก DTO / Entity** — even ถ้ายังไม่ validate
6. **Export เฉพาะที่จำเป็น** — encapsulation ของ Module สำคัญ

---

## แบบฝึกหัดก่อนทำ Lab

1. อธิบายความต่างระหว่าง Module / Controller / Provider ด้วยคำพูดของตัวเอง
2. วาด diagram DI ของ `OrdersController` ที่พึ่งพา `OrdersService` และ `PricingService`
3. เขียน route ที่รองรับ `GET /orders?status=paid&from=2026-01-01`

เมื่อพร้อม → ไปที่ [`LAB.md`](./LAB.md)
