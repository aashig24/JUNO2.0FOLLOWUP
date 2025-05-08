import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

async function migrateClassroom() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("Creating classroom_bookings table...");
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classroom_bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        classroom TEXT NOT NULL,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        alternative_name TEXT,
        alternative_id TEXT
      );
    `);
    
    console.log("Classroom bookings table created successfully");
  } catch (error) {
    console.error("Error creating classroom_bookings table:", error);
    throw error;
  }
}

migrateClassroom()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });