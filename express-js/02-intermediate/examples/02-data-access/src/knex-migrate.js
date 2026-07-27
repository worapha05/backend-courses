/**
 * Knex migration runner — creates users/products tables on PostgreSQL
 * DATABASE_URL=postgresql://bootcamp:bootcamp@localhost:5432/express_bootcamp
 */
import knex from 'knex';

const connection = process.env.DATABASE_URL;
if (!connection) {
  console.error('Set DATABASE_URL to a PostgreSQL connection string');
  process.exit(1);
}

const db = knex({
  client: 'pg',
  connection,
  pool: { min: 1, max: 5 },
});

async function migrate() {
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.string('email').notNullable().unique();
      t.string('name').notNullable();
      t.string('password_hash').notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('created table: users');
  }

  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.string('sku').notNullable().unique();
      t.string('name').notNullable();
      t.integer('price').notNullable();
      t.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('created table: products');
  }

  console.log('migrations ok');
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
