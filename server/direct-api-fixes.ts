import express, { Request, Response } from "express";
import { pool } from "./db";

// This function gets student bookings directly from the database
export async function getStudentBookings(req: Request, res: Response) {
  try {
    console.log("\n--------------------------------------");
    console.log("DIRECT STUDENT BOOKINGS API CALLED");
    
    // Extract user info from session
    const userId = req.session.user?.id;
    const userEmail = req.session.user?.email;
    const userName = req.session.user?.fullName;
    
    console.log(`User from session: ID=${userId}, Name=${userName}, Email=${userEmail}`);
    
    if (!userId) {
      console.log("❌ ERROR: No user ID in session");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verify user exists in database
    const userVerifyQuery = await pool.query(
      `SELECT id, username, email, full_name 
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (userVerifyQuery.rowCount === 0) {
      console.log(`❌ ERROR: User ID ${userId} not found in database`);
      return res.status(404).json({ message: "User not found" });
    }
    
    const verifiedUser = userVerifyQuery.rows[0];
    console.log(`✓ User verified: ID=${verifiedUser.id}, Email=${verifiedUser.email}`);
    
    // Get user's bookings with a direct prepared statement
    const bookingsQuery = `
      SELECT 
        mb.id, 
        mb.user_id, 
        mb.mentor_id, 
        mb.date, 
        mb.time, 
        mb.purpose, 
        mb.status, 
        mb.rejection_reason, 
        mb.created_at,
        fm.name as mentor_name, 
        fm.office
      FROM 
        mentor_bookings mb
      LEFT JOIN 
        faculty_mentors fm ON mb.mentor_id = fm.id
      WHERE 
        mb.user_id = $1
      ORDER BY 
        mb.created_at DESC
    `;
    
    const bookingsResult = await pool.query(bookingsQuery, [userId]);
    
    // Debug each found booking
    console.log(`Found ${bookingsResult.rowCount} bookings for user ${userId}`);
    bookingsResult.rows.forEach((booking, index) => {
      console.log(`[${index + 1}] Booking ID=${booking.id}, User=${booking.user_id}, Purpose=${booking.purpose}, Status=${booking.status}`);
    });
    
    // Format bookings for client
    const formattedBookings = bookingsResult.rows.map(booking => ({
      id: booking.id,
      userId: booking.user_id,
      mentorId: booking.mentor_id,
      date: booking.date,
      time: booking.time,
      purpose: booking.purpose,
      status: booking.status,
      rejectionReason: booking.rejection_reason,
      createdAt: booking.created_at,
      mentor: {
        name: booking.mentor_name,
        office: booking.office
      }
    }));
    
    console.log(`Returning ${formattedBookings.length} bookings`);
    console.log("--------------------------------------\n");
    
    return res.json(formattedBookings);
  } catch (error) {
    console.error("❌ ERROR in student bookings endpoint:", error);
    return res.status(500).json({ 
      message: "Failed to fetch bookings", 
      error: String(error) 
    });
  }
}

// This function gets pending bookings for faculty members
export async function getFacultyPendingBookings(req: Request, res: Response) {
  try {
    console.log("\n--------------------------------------");
    console.log("FACULTY PENDING BOOKINGS API CALLED");
    
    // Extract user info from session
    const userId = req.session.user?.id;
    const userEmail = req.session.user?.email;
    const role = req.session.user?.role;
    
    console.log(`Faculty user: ID=${userId}, Email=${userEmail}, Role=${role}`);
    
    // Validate faculty permissions
    if (!userId) {
      console.log("❌ ERROR: No user ID in session");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (role !== "faculty") {
      console.log("❌ ERROR: User is not faculty");
      return res.status(403).json({ message: "Access denied. Faculty only." });
    }
    
    // Get faculty mentor ID from email
    const facultyQuery = await pool.query(
      `SELECT id FROM faculty_mentors WHERE email = $1`,
      [userEmail]
    );
    
    if (facultyQuery.rowCount === 0) {
      console.log(`❌ ERROR: No faculty profile found for email ${userEmail}`);
      return res.status(404).json({ message: "Faculty mentor profile not found" });
    }
    
    const mentorId = facultyQuery.rows[0].id;
    console.log(`✓ Found faculty mentor ID: ${mentorId}`);
    
    // Get pending bookings with student information
    const bookingsQuery = `
      SELECT 
        mb.id, 
        mb.user_id, 
        mb.mentor_id, 
        mb.date, 
        mb.time, 
        mb.purpose, 
        mb.status, 
        mb.rejection_reason, 
        mb.created_at,
        u.full_name, 
        u.email
      FROM 
        mentor_bookings mb
      JOIN 
        users u ON mb.user_id = u.id
      WHERE 
        mb.mentor_id = $1 AND mb.status = 'pending'
    `;
    
    const bookingsResult = await pool.query(bookingsQuery, [mentorId]);
    
    // Debug each found booking
    console.log(`Found ${bookingsResult.rowCount} pending bookings for mentor ${mentorId}`);
    bookingsResult.rows.forEach((booking, index) => {
      console.log(`[${index + 1}] Booking ID=${booking.id}, Student=${booking.full_name}, Purpose=${booking.purpose}`);
    });
    
    // Format bookings for client
    const formattedBookings = bookingsResult.rows.map(booking => ({
      id: booking.id,
      userId: booking.user_id,
      mentorId: booking.mentor_id,
      date: booking.date,
      time: booking.time,
      purpose: booking.purpose,
      status: booking.status,
      rejectionReason: booking.rejection_reason,
      createdAt: booking.created_at,
      student: {
        id: booking.user_id,
        fullName: booking.full_name,
        email: booking.email
      }
    }));
    
    console.log(`Returning ${formattedBookings.length} pending bookings`);
    console.log("--------------------------------------\n");
    
    return res.json(formattedBookings);
  } catch (error) {
    console.error("❌ ERROR in faculty pending-bookings endpoint:", error);
    return res.status(500).json({ 
      message: "Failed to fetch pending bookings", 
      error: String(error) 
    });
  }
}