import { db } from "./db";

async function createTestBooking() {
  console.log("Creating additional test booking...");
  
  try {
    // Use Harshitha as the student (id=4) and Arun Avinash as mentor
    const studentId = 4; // Harshitha's ID
    
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
    
    // Check if this booking already exists
    const existingBooking = await db.execute(`
      SELECT * FROM mentor_bookings
      WHERE user_id = ${studentId} AND mentor_id = ${mentorId}
    `);
    
    if (existingBooking.rowCount > 0) {
      console.log("Harshitha's booking already exists");
      return;
    }
    
    // Create a test booking
    await db.execute(`
      INSERT INTO mentor_bookings (user_id, mentor_id, date, time, purpose, status)
      VALUES (${studentId}, ${mentorId}, '2025-05-05', '11:30 AM', 'Discuss career opportunities', 'pending')
    `);
    
    console.log(`Created test booking from Harshitha (${studentId}) to Arun Avinash (${mentorId})`);
    
  } catch (error) {
    console.error("Error creating test booking:", error);
  }
}

createTestBooking().catch(console.error);