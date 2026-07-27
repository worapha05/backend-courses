import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/HttpError.js';

/** In-memory user store for the demo */
const users = new Map();

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    issuer: 'express-bootcamp',
    audience: 'api',
  });
}

export async function register({ email, password, name }) {
  const normalized = email.toLowerCase();
  if ([...users.values()].some((u) => u.email === normalized)) {
    throw new HttpError(409, 'Email already registered');
  }
  const user = {
    id: randomUUID(),
    email: normalized,
    name,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  };
}

export async function login({ email, password }) {
  const user = [...users.values()].find((u) => u.email === email.toLowerCase());
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  };
}

export async function getProfile(userId) {
  const user = users.get(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}
