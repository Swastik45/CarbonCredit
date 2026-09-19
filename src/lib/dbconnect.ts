import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = (): PrismaClient => {
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
