import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";

// Make sure the uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize SQLite database
const sqlite = new Database("mathmath.db");

// Create database instance
export const db = drizzle(sqlite, { schema });

// Create tables using SQL
try {
  console.log("Ensuring database tables exist...");

  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      profile_picture TEXT,
      problems_solved INTEGER NOT NULL DEFAULT 0,
      problems_created INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create problems table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT,
      options TEXT,
      correct_answer TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      tags TEXT,
      solve_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  // Create solved_problems table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS solved_problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      solved_at INTEGER NOT NULL DEFAULT (unixepoch()),
      points_earned INTEGER NOT NULL
    )
  `);

  // Create saved_problems table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS saved_problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      saved_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  console.log("Database ready!");
} catch (error) {
  console.error("Error setting up database:", error);
}
