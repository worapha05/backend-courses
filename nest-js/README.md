📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/nest-js-prompt.md)

---

# NestJS Bootcamp — Zero to Expert

NestJS backend bootcamp ครอบคลุมตั้งแต่พื้นฐานถึงระดับ Production

## โครงสร้าง

| Level              | Topics                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `01-beginner/`     | Modular Architecture, Dependency Injection, HTTP Routing                                        |
| `02-intermediate/` | Validation Pipe, Prisma ORM, Exception Filters, Interceptors, Custom Pipes                      |
| `03-expert/`       | Guards & RBAC, Security Production (Helmet, Rate Limiting, Health Checks), Testing (Unit & E2E) |

## 03-expert — เนื้อหา

```
03-expert/
├── README.md
├── LAB.md
├── examples/
│   ├── 01-guards-rbac/          # Guards, Custom Decorators, Metadata Reflection
│   ├── 02-security-production/  # Helmet, Throttler, CORS, Graceful Shutdown, Terminus
│   └── 03-testing/              # Unit Test with @nestjs/testing, E2E with supertest
└── lab/solution/                # Product Catalog API รวมทุก concept
```

รันแต่ละ example:

```bash
cd 03-expert/examples/01-guards-rbac && npm install && npm run start:dev
cd 03-expert/examples/02-security-production && npm install && npm run start:dev
cd 03-expert/examples/03-testing && npm install && npm run test && npm run test:e2e
```
