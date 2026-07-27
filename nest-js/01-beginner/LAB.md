# Lab — Beginner: Inventory API (Modular + DI)

## เป้าหมาย

สร้าง NestJS API สำหรับจัดการคลังสินค้า (Inventory) ฝึก **Modular Architecture**, **Dependency
Injection**, และ **HTTP routing** แบบ strongly-typed

## โจทย์

สร้าง REST API ตาม endpoint ต่อไปนี้:

| Method  | Path                          | คำอธิบาย                          |
| ------- | ----------------------------- | --------------------------------- |
| `GET`   | `/inventory/items`            | ค้นหาสินค้าด้วย query             |
| `GET`   | `/inventory/items/:sku`       | ดึงสินค้าตาม SKU                  |
| `POST`  | `/inventory/items`            | เพิ่มสินค้าใหม่                   |
| `PATCH` | `/inventory/items/:sku/stock` | ปรับจำนวนสต็อก (+/-)              |
| `GET`   | `/inventory/low-stock`        | รายการที่ `quantity <= threshold` |

### Query ของ `GET /inventory/items`

| Query       | ประเภท          | ความหมาย                    |
| ----------- | --------------- | --------------------------- |
| `q`         | string          | ค้นใน `name` หรือ `sku`     |
| `warehouse` | string          | กรองคลัง เช่น `BKK` / `CNX` |
| `minQty`    | number          | จำนวนขั้นต่ำ                |
| `sort`      | `asc` \| `desc` | เรียงตาม `quantity`         |

### โครงข้อมูลสินค้า

```ts
interface InventoryItem {
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  unitCost: number;
}
```

### ข้อกำหนดบังคับ (Architecture)

1. มี `InventoryModule` แยกจาก `AppModule`
2. มี `InventoryController` + `InventoryService`
3. ใช้ **custom provider token** สำหรับ repository:

- `INVENTORY_REPOSITORY` + interface `InventoryRepository`
- implementation: `InMemoryInventoryRepository`

4. มี `StockPolicyService` ที่ถูก inject เข้า `InventoryService`:

- `isLowStock(item, threshold = 5): boolean`
- `applyDelta(current, delta): number` — ห้ามให้ quantity ติดลบ (throw `BadRequestException`)

5. Controller **ห้าม** เก็บ array เอง — logic อยู่ที่ Service / Repository

### Seed ข้อมูลเริ่มต้น

```ts
[
  { sku: 'SKU-A1', name: 'Laptop Stand', warehouse: 'BKK', quantity: 12, unitCost: 890 },
  { sku: 'SKU-B2', name: 'USB-C Cable', warehouse: 'BKK', quantity: 3, unitCost: 120 },
  { sku: 'SKU-C3', name: 'Webcam HD', warehouse: 'CNX', quantity: 0, unitCost: 1500 },
  { sku: 'SKU-D4', name: 'Desk Lamp', warehouse: 'CNX', quantity: 8, unitCost: 650 },
];
```

### ตัวอย่างการเรียก

```bash
# ค้นหาในคลัง BKK ที่ qty >= 1 เรียง desc
curl 'http://localhost:3010/inventory/items?warehouse=BKK&minQty=1&sort=desc'

# ปรับสต็อก
curl -X PATCH http://localhost:3010/inventory/items/SKU-B2/stock \
  -H 'Content-Type: application/json' \
  -d '{"delta": 10}'

# low stock (threshold default = 5)
curl http://localhost:3010/inventory/low-stock
curl 'http://localhost:3010/inventory/low-stock?threshold=1'
```

## เกณฑ์ผ่าน

- [ ] Module / Controller / Service แยกชัด
- [ ] Repository inject ด้วย token (ไม่ inject concrete class ใน Service โดยตรง)
- [ ] Query filtering + sorting ทำงานถูกต้อง
- [ ] `applyDelta` ป้องกัน quantity ติดลบ
- [ ] `GET /inventory/low-stock` ใช้ `StockPolicyService`

## คำใบ้

- ใช้ `@Inject(INVENTORY_REPOSITORY)` ใน Service
- `providers: [{ provide: INVENTORY_REPOSITORY, useClass: InMemoryInventoryRepository }]`
- `NotFoundException` เมื่อ SKU ไม่มี

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
npm install
npm run start:dev
# server ที่ port 3010
```
