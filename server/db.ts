import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { logger } from "./logger";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 40, // Increased for VPS deployment with 20 concurrent workers
  idleTimeoutMillis: 60000, // Close idle connections after 60 seconds
  connectionTimeoutMillis: 30000, // Wait 30 seconds for connection
  maxUses: 7500, // Recycle connections after 7500 uses
});

export const db = drizzle(pool, { schema });

// Log connection pool stats periodically in debug mode
if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    logger.debug(`[DB Pool] Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  }, 60000); // Log every 60 seconds
}

// Get connection pool stats
export function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    maxConnections: 40,
  };
}

// Retry helper for database operations with comprehensive error detection
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 250
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Comprehensive retry detection for Neon/WebSocket connection errors
      const isRetryable = 
        error.message?.includes('Connection terminated') ||
        error.message?.includes('WebSocket is not open') ||
        error.message?.includes('Server closed the connection unexpectedly') ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('Connection timeout') ||
        error.message?.includes('timeout exceeded when trying to connect') ||
        error.message?.includes('connection to server') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'EPIPE' ||
        error.code === '57P01' || // postgres admin shutdown
        error.code === '57P02' || // postgres crash shutdown
        error.code === '57P03' || // postgres cannot connect now
        error.code === '08006' || // connection failure
        error.code === '08003'; // connection does not exist
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff with jitter, capped at 5 seconds
      const backoff = Math.min(baseDelayMs * Math.pow(2, attempt), 5000);
      const jitter = Math.random() * backoff * 0.3;
      const totalDelay = backoff + jitter;
      
      logger.warn(`[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed (${error.message}), retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError || new Error('Database operation failed after retries');
}
