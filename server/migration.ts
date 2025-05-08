import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log("Starting migration to remove location and type columns from mess_transactions...");
    
    // First, make the columns nullable
    await db.execute(sql`
      ALTER TABLE mess_transactions 
      ALTER COLUMN type DROP NOT NULL,
      ALTER COLUMN location DROP NOT NULL;
    `);
    
    console.log("Columns set to nullable");
    
    // Set default values for existing rows
    await db.execute(sql`
      UPDATE mess_transactions 
      SET type = 'cash', location = 'University Canteen'
      WHERE type IS NULL OR location IS NULL;
    `);
    
    console.log("Default values applied to existing rows");
    
    // Now drop the columns
    await db.execute(sql`
      ALTER TABLE mess_transactions 
      DROP COLUMN type,
      DROP COLUMN location;
    `);
    
    console.log("Columns dropped successfully");
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await pool.end();
  }
}

// Run the migration if this is the main module
if (import.meta.url === `file://${__filename}`) {
  runMigration();
}

export default runMigration;