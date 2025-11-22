import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 * Uses singleton pattern to ensure only one instance exists
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
  return prisma;
}

/**
 * Initialize Prisma client and test connection
 */
export async function initPrisma(): Promise<PrismaClient> {
  const client = getPrismaClient();
  
  // Test connection
  try {
    await client.$connect();
    console.log("✅ Prisma client connected to database");
    return client;
  } catch (error) {
    console.error("❌ Failed to connect Prisma client to database:", error);
    throw error;
  }
}

/**
 * Close Prisma client connection
 */
export async function closePrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log("🔌 Prisma client disconnected");
  }
}

/**
 * Test database connection using Prisma
 */
export async function testPrismaConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Prisma connection test failed:", error);
    return false;
  }
}

