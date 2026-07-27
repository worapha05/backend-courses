import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/user.repository.js';
import { HttpError } from '../middleware/HttpError.js';

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    issuer: 'shopforge',
    audience: 'api',
  });
}

export async function register({ email, password, name }) {
  const normalized = email.toLowerCase();
  if (await userRepo.findByEmail(normalized)) {
    throw new HttpError(409, 'Email already registered');
  }
  const user = await userRepo.create({
    email: normalized,
    name,
    passwordHash: await bcrypt.hash(password, 10),
  });
  return {
    user: publicUser(user),
    accessToken: signToken(user),
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  };
}

export async function login({ email, password }) {
  const user = await userRepo.findByEmail(email.toLowerCase());
  if (!user) throw new HttpError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  return {
    user: publicUser(user),
    accessToken: signToken(user),
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  };
}

export async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}
