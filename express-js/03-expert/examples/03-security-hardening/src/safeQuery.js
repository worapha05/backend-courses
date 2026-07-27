const USERS = [
  { id: '1', email: 'alice@bootcamp.dev', name: 'Alice' },
  { id: '2', email: 'bob@bootcamp.dev', name: 'Bob' },
];

/**
 * Safe lookup — only accepts a string email, never a raw query object.
 * This mirrors the "parameterized / typed input" mindset for SQL/NoSQL.
 */
export function safeFindUser(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('email query must be a string');
  }
  // Imagine: db('users').where({ email }).first()
  // Never: `SELECT * FROM users WHERE email = '${email}'`
  return USERS.find((u) => u.email === email.toLowerCase()) ?? null;
}
