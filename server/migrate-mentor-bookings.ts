import { db } from "./db";

async function migrateMentorBookings() {
  console.log("Starting mentor bookings table migration...");
  
  try {
    // Add the rejection_reason column to the mentor_bookings table
    await db.execute(`
      ALTER TABLE mentor_bookings
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
    
    console.log("Added rejection_reason column to mentor_bookings table");
    
    // Create a test booking from Sanjana to Arun Avinash if it doesn't exist
    const existingBooking = await db.execute(`
      SELECT * FROM mentor_bookings
      WHERE user_id = 3 AND mentor_id = 1
    `);
    
    if (!existingBooking.rowCount) {
      // Get the user ID for Sanjana
      const sanjanaId = 3; // Known ID from the existing database
      
      // Get the mentor ID for Arun Avinash
      const mentorQueryResult = await db.execute(`
        SELECT id FROM faculty_mentors 
        WHERE email = 'arunavinash@mahindrauniversity.edu.in' 
        LIMIT 1
      `);
      
      if (mentorQueryResult.rowCount === 0) {
        console.log("Mentor not found, skipping test booking creation");
        return;
      }
      
      const mentorId = mentorQueryResult.rows[0].id;
      
      // Create a test booking
      await db.execute(`
        INSERT INTO mentor_bookings (user_id, mentor_id, date, time, purpose, status)
        VALUES (${sanjanaId}, ${mentorId}, '2025-05-04', '10:00 AM', 'Discuss project progress', 'pending')
      `);
      
      console.log(`Created test booking from Sanjana (${sanjanaId}) to Arun Avinash (${mentorId})`);
    } else {
      console.log("Test booking already exists");
    }
    
    console.log("Mentor bookings table migration completed successfully!");
  } catch (error) {
    console.error("Error during mentor bookings migration:", error);
    throw error;
  }
}

migrateMentorBookings().catch(console.error);