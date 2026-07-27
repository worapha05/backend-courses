/**
 * Prisma demo — create user + product
 * Requires: prisma generate + migrate (see README)
 *
 * DATABASE_URL="file:./dev.db" node .../prisma-demo.js
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure default SQLite URL for local learning
process.env.DATABASE_URL ??= `file:${join(__dirname, '../prisma/dev.db')}`;

let PrismaClient;
try {
  ({ PrismaClient } = await import('../generated/prisma/index.js'));
} catch {
  console.error(
    'Prisma client not generated yet.\n' +
      'Run:\n' +
      ' DATABASE_URL="file:./dev.db" npx prisma generate --schema=02-intermediate/examples/02-data-access/prisma/schema.prisma\n' +
      ' DATABASE_URL="file:./dev.db" npx prisma migrate dev --name init --schema=02-intermediate/examples/02-data-access/prisma/schema.prisma',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const email = `dev-${Date.now()}@bootcamp.local`;

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Bootcamp Dev',
      passwordHash: 'not-a-real-hash',
      products: {
        create: {
          sku: `SKU-${Date.now()}`,
          name: 'USB-C Hub',
          price: 1290,
        },
      },
    },
    include: { products: true },
  });

  console.log('Created user with product:');
  console.log(JSON.stringify(user, null, 2));

  const count = await prisma.product.count();
  console.log('Total products:', count);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
