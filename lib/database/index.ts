import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Get database URL from environment
const connectionString = process.env.DATABASE_URL || "";

// Create a dummy db for build time when DATABASE_URL is not available
// At runtime, the actual connection will be used
const client = connectionString 
  ? postgres(connectionString, { prepare: false })
  : null;

// Export db - will throw at runtime if used without DATABASE_URL
export const db = client 
  ? drizzle(client, { schema })
  : new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error("DATABASE_URL environment variable is not set");
      },
    });
