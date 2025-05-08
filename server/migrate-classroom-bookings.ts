import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../shared/schema";
import { faker } from '@faker-js/faker';
import { eq, and } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function migrateClassroomBookings() {
  console.log("Creating classroom_bookings table...");

  try {
    // Create classroom_bookings table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classroom_bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        classroom TEXT NOT NULL,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        alternative_name TEXT,
        alternative_id TEXT,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log("Classroom bookings table created successfully");
    
    // Add some existing bookings for demonstration (some classrooms will be unavailable)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const formattedTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    // Check if we already have bookings for specific time slots
    const existingBookings = await db.execute(`
      SELECT * FROM classroom_bookings 
      WHERE date = '${formattedToday}' AND time_slot = '08:30-09:30'
    `);
    const bookingsCount = existingBookings.rowCount || 0;
    
    // If no existing bookings for today's morning slot, add some
    if (bookingsCount === 0) {
      console.log("Adding sample classroom bookings data...");
      
      // Create 10 random bookings for various time slots
      // Book some specific classrooms for today's morning (8:30-9:30) to demonstrate unavailability
      const timeSlots = [
        "08:30-09:30", "09:30-10:30", "10:30-11:30", "11:30-12:30", 
        "12:30-13:30", "13:30-14:30", "14:30-15:30", "15:30-16:30", 
        "16:30-17:30", "17:30-18:30", "Night Permission"
      ];
      
      // Book most of ECR rooms for today's morning to demonstrate limited availability
      const bookedClassrooms = [
        "ECR 1", "ECR 2", "ECR 3", "ECR 4", "ECR 5", "ECR 6", "ECR 7", 
        "ECR 8", "ECR 9", "ECR 10", "ECR 11", "ECR 12", "ECR 13", "ECR 14", 
        "ELT 1", "ELT 2", "ELT 3"
      ];
      
      for (const classroom of bookedClassrooms) {
        await db.insert(schema.classroomBookings).values({
          userId: Math.floor(Math.random() * 3) + 2, // User IDs 2-4
          classroom: classroom,
          date: formattedToday,
          timeSlot: "08:30-09:30",
          purpose: `Faculty lecture: ${faker.lorem.sentence(5)}`,
          status: "approved"
        });
      }
      
      // Add some random bookings for other time slots
      for (let i = 0; i < 10; i++) {
        const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const randomClassroom = `ECR ${Math.floor(Math.random() * 18) + 1}`;
        
        // Skip if it's the morning slot that we already filled
        if (randomTimeSlot === "08:30-09:30" && bookedClassrooms.includes(randomClassroom)) {
          continue;
        }
        
        await db.insert(schema.classroomBookings).values({
          userId: Math.floor(Math.random() * 3) + 2, // User IDs 2-4
          classroom: randomClassroom,
          date: Math.random() > 0.5 ? formattedToday : formattedTomorrow,
          timeSlot: randomTimeSlot,
          purpose: faker.lorem.sentence(10),
          status: ["pending", "approved", "rejected"][Math.floor(Math.random() * 3)]
        });
      }
      
      // Add some bookings specifically for ELT rooms
      for (let i = 0; i < 5; i++) {
        const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const randomClassroom = `ELT ${Math.floor(Math.random() * 7) + 1}`;
        
        // Skip if it's the morning slot that we already filled
        if (randomTimeSlot === "08:30-09:30" && bookedClassrooms.includes(randomClassroom)) {
          continue;
        }
        
        await db.insert(schema.classroomBookings).values({
          userId: Math.floor(Math.random() * 3) + 2, // User IDs 2-4
          classroom: randomClassroom,
          date: Math.random() > 0.5 ? formattedToday : formattedTomorrow,
          timeSlot: randomTimeSlot,
          purpose: faker.lorem.sentence(10),
          status: ["pending", "approved", "rejected"][Math.floor(Math.random() * 3)]
        });
      }
      
      console.log("Sample classroom bookings created successfully");
    } else {
      console.log("Sample classroom bookings already exist, skipping data creation");
    }
  } catch (error) {
    console.error("Error creating classroom_bookings:", error);
    throw error;
  }
}

migrateClassroomBookings()
  .then(() => {
    console.log("Classroom bookings migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Classroom bookings migration failed:", error);
    process.exit(1);
  });