import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateLostFound() {
  try {
    console.log("Starting migration for lost_found_items table...");
    
    // Add new columns
    await db.execute(sql`
      ALTER TABLE lost_found_items
      ADD COLUMN IF NOT EXISTS submission_location TEXT,
      ADD COLUMN IF NOT EXISTS other_location TEXT;
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await pool.end();
  }
}

// Run the migration if this is the main module
if (import.meta.url === `file://${__filename}`) {
  migrateLostFound();
}

export default migrateLostFound;