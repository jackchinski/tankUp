import Fastify from "fastify";
import { InMemoryIntentStore } from "./store";
import { DispersalService } from "./services/dispersal";
import { registerRoutes } from "./routes";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  // Initialize Fastify
  const fastify = Fastify({
    logger: true,
  });

  // Initialize store and services
  // TODO: Replace InMemoryIntentStore with a real database implementation
  // For example:
  // - PostgreSQL with Prisma or TypeORM
  // - MongoDB with Mongoose
  // - Redis for caching + PostgreSQL for persistence
  const store = new InMemoryIntentStore();
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
    console.log(`🚀 Gas Fountain backend server listening on http://${HOST}:${PORT}`);
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
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});

