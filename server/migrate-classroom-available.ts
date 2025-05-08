import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { pool } from "./db";
import * as schema from "@shared/schema";

async function migrateClassroomAvailable() {
  console.log("Starting classroom available table migration...");
  
  const db = drizzle(pool, { schema });
  
  try {
    // Create the table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classroom_available (
        id SERIAL PRIMARY KEY,
        classroom TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT true
      );
    `);
    
    console.log("Table created, now populating with data...");
    
    // First, clear any existing data
    await db.execute(`DELETE FROM classroom_available;`);
    
    // All classrooms
    const classrooms = [
      ...Array(18).fill(0).map((_, i) => `ECR ${i + 1}`),
      ...Array(7).fill(0).map((_, i) => `ELT ${i + 1}`)
    ];
    
    // All time slots
    const timeSlots = [
      "08:30-09:30", "09:30-10:30", "10:30-11:30", "11:30-12:30", 
      "12:30-13:30", "13:30-14:30", "14:30-15:30", "15:30-16:30", 
      "16:30-17:30", "17:30-18:30", "Night Permission"
    ];
    
    // Default all classrooms as available for all time slots
    for (const classroom of classrooms) {
      for (const timeSlot of timeSlots) {
        // Special case: For 09:30-10:30 time slot, only ECR 1, 2, and 3 are available
        const isAvailable = 
          timeSlot === "09:30-10:30" 
            ? ["ECR 1", "ECR 2", "ECR 3"].includes(classroom) 
            : true;
        
        // Use direct string values instead of parameters for compatibility
        await db.execute(
          `INSERT INTO classroom_available (classroom, time_slot, is_available)
          VALUES ('${classroom}', '${timeSlot}', ${isAvailable})`
        );
      }
    }
    
    console.log("Classroom available table migration completed successfully!");
  } catch (error) {
    console.error("Error during classroom available migration:", error);
    throw error;
  }
}

migrateClassroomAvailable().catch(console.error);