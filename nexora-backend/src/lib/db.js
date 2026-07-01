// src/lib/db.js
// Singleton Prisma client — import this everywhere, never instantiate directly.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
