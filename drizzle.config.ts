import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local for local development
config({ path: ".env.local" });

export default {
  schema: "./lib/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
} satisfies Config;
