import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/database/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./roony.db",
  },
} satisfies Config;

