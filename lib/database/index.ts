import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Get database path
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./roony.db";

// Ensure directory exists
const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
