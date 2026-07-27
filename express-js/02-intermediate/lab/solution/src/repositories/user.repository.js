import { randomUUID } from 'node:crypto';

const users = new Map();

export async function findById(id) {
  return users.get(id) ?? null;
}

export async function findByEmail(email) {
  return [...users.values()].find((u) => u.email === email) ?? null;
}

export async function create({ email, name, passwordHash }) {
  const user = {
    id: randomUUID(),
    email,
    name,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return user;
}
