import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["warn", "error"], // set to ['query','info','warn','error'] if you want verbose logs
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
