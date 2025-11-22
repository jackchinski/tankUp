import { Pool, PoolConfig } from "pg";

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initDb(config: DbConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on("error", (err: Error) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
  });

  return pool;
}

/**
 * Get the database connection pool
 */
export function getDb(): Pool {
  if (!pool) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return pool;
}

/**
 * Close the database connection pool
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}
