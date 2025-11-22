import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaIntentStore } from "./store/prisma";
import { DispersalService } from "./services/dispersal";
import { registerRoutes } from "./routes";
import { initPrisma, closePrisma, testPrismaConnection } from "./db/prisma";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  // Initialize Prisma client
  console.log("🔌 Connecting to database with Prisma...");

  // Set DATABASE_URL if not provided (for compatibility with existing env vars)
  if (!process.env.DATABASE_URL) {
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbUser = process.env.DB_USER || "gasfountain";
    const dbPassword = process.env.DB_PASSWORD || "gasfountain123";
    const dbName = process.env.DB_NAME || "gasfountain";

    process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
  }

  const prisma = await initPrisma();

  // Test database connection
  const dbConnected = await testPrismaConnection();
  if (!dbConnected) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }
  console.log("✅ Database connected successfully");

  // Initialize Fastify
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development (change to specific origins in production)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Indexer-Secret"],
  });

  // Initialize store and services with Prisma
  const store = new PrismaIntentStore(prisma);
  const dispersalService = new DispersalService(store);

  // Register routes
  registerRoutes(fastify, store, dispersalService);

  // Health check endpoint
  fastify.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(
      `🚀 Gas Fountain backend server listening on http://${HOST}:${PORT}`
    );
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📈 Status endpoint: http://${HOST}:${PORT}/status/:intentId`);
    console.log(`📜 History endpoint: http://${HOST}:${PORT}/history`);
    console.log(`📥 Event endpoint: http://${HOST}:${PORT}/event`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await closePrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await closePrisma();
  process.exit(0);
});

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
