/**
 * Knex demo — insert + join query
 */
import knex from 'knex';

const connection = process.env.DATABASE_URL;
if (!connection) {
  console.error('Set DATABASE_URL first (and run knex-migrate.js)');
  process.exit(1);
}

const db = knex({ client: 'pg', connection, pool: { min: 1, max: 5 } });

async function main() {
  const [user] = await db('users')
    .insert({
      email: `knex-${Date.now()}@bootcamp.local`,
      name: 'Knex User',
      password_hash: 'not-a-real-hash',
    })
    .returning(['id', 'email', 'name']);

  const [product] = await db('products')
    .insert({
      sku: `KNEX-${Date.now()}`,
      name: 'Docking Station',
      price: 3990,
      owner_id: user.id,
    })
    .returning('*');

  const rows = await db('products as p')
    .join('users as u', 'u.id', 'p.owner_id')
    .select('p.sku', 'p.name', 'p.price', 'u.email as ownerEmail')
    .where('p.id', product.id);

  console.log(rows);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
