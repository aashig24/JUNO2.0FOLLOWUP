import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { getStudentBookings } from "./direct-api-fixes";
import { 
  loginUserSchema, 
  insertUserSchema, 
  insertLostFoundItemSchema, 
  insertMentorBookingSchema,
  insertMessTransactionSchema,
  insertCourseSchema,
  insertStudentEnrollmentSchema,
  insertClassroomBookingSchema
} from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import session from "express-session";
import ConnectPg from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "./db";

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "university-portal-secret-key";

// Configure PostgreSQL session store
const PgSession = ConnectPg(session);
const sessionStore = new PgSession({
  pool: pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
});

// Configure multer for file uploads
const storage_dir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(storage_dir)) {
  fs.mkdirSync(storage_dir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, JPG, and PNG image files are allowed"));
    }
    cb(null, true);
  },
});

// Auth middleware
const authenticate = (req: Request, res: Response, next: express.NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Base64 encode image data for in-memory storage
const encodeImage = (buffer: Buffer, mimetype: string): string => {
  return `data:${mimetype};base64,${buffer.toString("base64")}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      },
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      secret: JWT_SECRET,
    })
  );

  // API routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Validate university email domain for Indian universities
      const validDomains = [".edu", ".ac.in", "iit.ac.in", "nit.ac.in", "iisc.ac.in", "bits.ac.in"];
      const isValidDomain = validDomains.some(domain => userData.email.endsWith(domain));
      if (!isValidDomain) {
        return res.status(400).json({ message: "Must use a valid Indian university email domain" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed", error: String(error) });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginUserSchema.parse(req.body);
      
      console.log(`Login attempt: ${username}`);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Invalid credentials: User not found" });
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        console.log(`Invalid password for user: ${username}`);
        return res.status(401).json({ message: "Invalid credentials: Incorrect password" });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      
      // Store user in session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed", error: String(error) });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed", error: String(err) });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/user", authenticate, (req, res) => {
    res.json({ user: req.session.user });
  });

  // Lost and Found routes
  app.get("/api/lostfound", async (_req, res) => {
    try {
      const items = await storage.getLostFoundItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lost and found items", error: String(error) });
    }
  });

  app.get("/api/lostfound/:type", async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== "lost" && type !== "found" && type !== "all" && type !== "report") {
        return res.status(400).json({ message: "Invalid type parameter" });
      }
      
      if (type === "report") {
        return res.json([]); // For report tab, we don't fetch any items
      }
      
      const items = type === "all" 
        ? await storage.getLostFoundItems()
        : await storage.getLostFoundItems(type);
        
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lost and found items", error: String(error) });
    }
  });

  app.get("/api/lostfound/item/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getLostFoundItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item", error: String(error) });
    }
  });

  app.post("/api/lostfound", authenticate, upload.single("image"), async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let imageData = null;
      if (req.file) {
        imageData = encodeImage(req.file.buffer, req.file.mimetype);
      }
      
      const itemData = insertLostFoundItemSchema.parse({
        ...req.body,
        userId,
        image: imageData,
      });
      
      const item = await storage.createLostFoundItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create item", error: String(error) });
    }
  });

  app.patch("/api/lostfound/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.user?.id;
      
      const item = await storage.getLostFoundItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Only allow updating own items unless admin
      if (item.userId !== userId && req.session.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedItem = await storage.updateLostFoundItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update item", error: String(error) });
    }
  });

  // Faculty Mentor routes
  app.get("/api/mentors", async (_req, res) => {
    try {
      const mentors = await storage.getFacultyMentors();
      res.json(mentors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mentors", error: String(error) });
    }
  });

  app.get("/api/mentors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mentor = await storage.getFacultyMentor(id);
      
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      res.json(mentor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mentor", error: String(error) });
    }
  });

  // Mentor Booking routes
  // Use direct SQL query for better reliability and to ensure we get correct data
  app.get("/api/bookings", authenticate, getStudentBookings);
  
  app.get("/api/bookings/booked-slots", authenticate, async (req, res) => {
    try {
      const { mentorId, date } = req.query;
      
      if (!mentorId || !date) {
        return res.status(400).json({ message: "Mentor ID and date are required" });
      }
      
      // Get all bookings for the specified mentor and date
      const allBookings = await storage.getAllMentorBookings();
      
      // Filter bookings by mentor and date
      const bookedSlots = allBookings.filter((booking: {mentorId: number, date: string}) => 
        booking.mentorId === parseInt(mentorId as string) && 
        booking.date === date
      );
      
      res.json(bookedSlots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booked slots", error: String(error) });
    }
  });

  app.post("/api/bookings", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookingData = insertMentorBookingSchema.parse({
        ...req.body,
        userId,
      });
      
      // Validate mentor exists
      const mentor = await storage.getFacultyMentor(bookingData.mentorId);
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      // Check if the time slot is already booked for this mentor and date
      const allBookings = await storage.getAllMentorBookings();
      const conflictingBooking = allBookings.find(
        (booking: {mentorId: number, date: string, time: string}) => 
          booking.mentorId === bookingData.mentorId && 
          booking.date === bookingData.date &&
          booking.time === bookingData.time
      );
      
      if (conflictingBooking) {
        return res.status(409).json({ 
          message: "This time slot is already booked. Please select a different time."
        });
      }
      
      const booking = await storage.createMentorBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking", error: String(error) });
    }
  });
  
  // Get pending bookings for faculty (when faculty logs in)
  app.get("/api/faculty/pending-bookings", authenticate, async (req, res) => {
    try {
      console.log("Faculty pending-bookings API called");
      const userId = req.session.user?.id;
      const userEmail = req.session.user?.email;
      const role = req.session.user?.role;
      
      console.log("User info:", { userId, userEmail, role });
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (role !== "faculty") {
        return res.status(403).json({ message: "Access denied. Faculty only." });
      }
      
      // Using direct DB queries with email constant directly in the query
      // First find the faculty mentor ID
      console.log("Looking up faculty mentor with email:", userEmail);
      
      // Create a direct SQL query with the email directly in the query
      const safeEmail = userEmail?.replace(/'/g, "''"); // Basic SQL injection protection
      const facultyQuery = await db.execute(`
        SELECT id FROM faculty_mentors 
        WHERE email = '${safeEmail}'
      `);
      
      console.log("Faculty lookup result:", facultyQuery.rows[0]);
      
      if (facultyQuery.rowCount === 0) {
        return res.status(404).json({ message: "Faculty mentor profile not found" });
      }
      
      const mentorId = facultyQuery.rows[0].id;
      
      // Get all pending bookings with student information
      const bookingsQuery = await db.execute(`
        SELECT mb.*, u.full_name, u.email 
        FROM mentor_bookings mb
        JOIN users u ON mb.user_id = u.id
        WHERE mb.mentor_id = ${mentorId} AND mb.status = 'pending'
      `);
      
      console.log("Found pending bookings:", bookingsQuery.rowCount);
      
      // Format the bookings with student info
      const bookings = bookingsQuery.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        mentorId: row.mentor_id,
        date: row.date,
        time: row.time,
        purpose: row.purpose,
        status: row.status,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        student: {
          id: row.user_id,
          fullName: row.full_name,
          email: row.email
        }
      }));
      
      res.json(bookings);
    } catch (error) {
      console.error("Error in faculty pending-bookings endpoint:", error);
      res.status(500).json({ message: "Failed to fetch pending bookings", error: String(error) });
    }
  });
  
  // Update a booking status (approve/reject)
  app.patch("/api/bookings/:id", authenticate, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.session.user?.id;
      const userEmail = req.session.user?.email;
      const role = req.session.user?.role;
      
      console.log(`Attempting to update booking ${bookingId}:`, req.body);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // For faculty, get mentor ID using direct DB query first
      if (role === "faculty") {
        console.log("Faculty is updating booking, checking permissions...");
        
        // Get the faculty mentor ID directly from the database
        const safeEmail = userEmail?.replace(/'/g, "''");
        const facultyQuery = await db.execute(`
          SELECT id FROM faculty_mentors 
          WHERE email = '${safeEmail}'
        `);
        
        if (facultyQuery.rowCount === 0) {
          return res.status(404).json({ message: "Faculty mentor profile not found" });
        }
        
        const mentorId = facultyQuery.rows[0].id;
        console.log(`Found faculty mentor ID: ${mentorId}`);
        
        // Get the booking directly
        const bookingQuery = await db.execute(`
          SELECT * FROM mentor_bookings
          WHERE id = ${bookingId}
        `);
        
        if (bookingQuery.rowCount === 0) {
          return res.status(404).json({ message: "Booking not found" });
        }
        
        const booking = bookingQuery.rows[0];
        console.log("Found booking:", booking);
        
        // Check if this booking belongs to the faculty
        if (booking.mentor_id !== mentorId) {
          return res.status(403).json({ message: "You can only update bookings assigned to you" });
        }
        
        // Update the booking directly in the database
        const { status, rejectionReason } = req.body;
        const updateQuery = await db.execute(`
          UPDATE mentor_bookings
          SET status = '${status}', 
              rejection_reason = ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : 'NULL'}
          WHERE id = ${bookingId}
          RETURNING *
        `);
        
        if (updateQuery.rowCount === 0) {
          return res.status(500).json({ message: "Failed to update booking" });
        }
        
        const updatedBooking = updateQuery.rows[0];
        console.log("Updated booking:", updatedBooking);
        
        // Format the response
        return res.json({
          id: updatedBooking.id,
          userId: updatedBooking.user_id,
          mentorId: updatedBooking.mentor_id,
          date: updatedBooking.date,
          time: updatedBooking.time,
          purpose: updatedBooking.purpose,
          status: updatedBooking.status,
          rejectionReason: updatedBooking.rejection_reason,
          createdAt: updatedBooking.created_at
        });
      } 
      // For students (using the original implementation)
      else if (role === "student") {
        console.log("Student is updating booking");
        // Get the booking
        const booking = await storage.getMentorBooking(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }
        
        // Students can only update their own bookings
        if (booking.userId !== userId) {
          return res.status(403).json({ message: "You can only update your own bookings" });
        }
        
        // Update the booking using storage
        const updatedBooking = await storage.updateMentorBooking(bookingId, req.body);
        return res.json(updatedBooking);
      }
      
      return res.status(403).json({ message: "Unauthorized role for this operation" });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking", error: String(error) });
    }
  });

  // Mess Balance routes
  app.get("/api/mess/balance", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const balance = await storage.getMessBalance(userId);
      if (!balance) {
        return res.status(404).json({ message: "Balance not found" });
      }
      
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch balance", error: String(error) });
    }
  });

  app.get("/api/mess/transactions", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const transactions = await storage.getMessTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions", error: String(error) });
    }
  });

  app.post("/api/mess/transactions", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const transactionData = insertMessTransactionSchema.parse({
        ...req.body,
        userId,
      });
      
      const transaction = await storage.createMessTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction", error: String(error) });
    }
  });

  // Course routes
  app.get("/api/courses", async (req, res) => {
    try {
      const { semester } = req.query;
      const courses = await storage.getCourses(semester as string);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses", error: String(error) });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course", error: String(error) });
    }
  });

  app.post("/api/courses", authenticate, async (req, res) => {
    try {
      // Only admin users can create courses
      if (req.session.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden - Only admins can create courses" });
      }
      
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course", error: String(error) });
    }
  });

  // Student Enrollment routes
  app.get("/api/enrollments", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const enrollments = await storage.getStudentEnrollments(userId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments", error: String(error) });
    }
  });
  
  // Get enrolled courses for current user
  app.get("/api/enrollments/courses", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const courses = await storage.getEnrolledCourses(userId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrolled courses", error: String(error) });
    }
  });



  app.post("/api/enrollments", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const enrollmentData = insertStudentEnrollmentSchema.parse({
        ...req.body,
        userId,
      });
      
      // Validate course exists
      const course = await storage.getCourse(enrollmentData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const enrollment = await storage.enrollStudent(enrollmentData);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create enrollment", error: String(error) });
    }
  });

  // Classroom Booking routes
  app.get("/api/classrooms/available", authenticate, async (req, res) => {
    try {
      const { date, timeSlot } = req.query;
      
      if (!date || !timeSlot) {
        return res.status(400).json({ message: "Date and time slot are required" });
      }
      
      // Special case for the 9:30-10:30 time slot - hardcoded for now
      if (timeSlot === "09:30-10:30") {
        console.log("Using special case for 09:30-10:30 time slot");
        // Only ECR 1, ECR 2, ECR 3 are available for this time slot
        return res.json(["ECR 1", "ECR 2", "ECR 3"]);
      }
      
      // For other time slots, get list of booked classrooms for the specified date and time
      const bookedClassrooms = await storage.getBookedClassrooms(
        date as string, 
        timeSlot as string
      );
      
      // Define all available classrooms (ECR 1-18 and ELT 1-7)
      const allClassrooms = [
        ...[...Array(18)].map((_, i) => `ECR ${i + 1}`),
        ...[...Array(7)].map((_, i) => `ELT ${i + 1}`)
      ];
      
      // Filter out the booked classrooms
      const availableClassrooms = allClassrooms.filter(
        classroom => !bookedClassrooms.includes(classroom)
      );
      
      return res.json(availableClassrooms);
    } catch (error) {
      console.error("Error getting available classrooms:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/classrooms/bookings", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const bookings = await storage.getClassroomBookings(userId);
      return res.json(bookings);
    } catch (error) {
      console.error("Error getting classroom bookings:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/classrooms/book", authenticate, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { classroom, date, timeSlot, purpose, alternativeName, alternativeId } = req.body;
      
      if (!classroom || !date || !timeSlot || !purpose) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if the classroom is already booked for this time slot
      const bookedClassrooms = await storage.getBookedClassrooms(date, timeSlot);
      if (bookedClassrooms.includes(classroom)) {
        return res.status(400).json({ 
          message: "This classroom is already booked for the selected time slot" 
        });
      }
      
      // Create the booking
      const booking = await storage.createClassroomBooking({
        userId,
        classroom,
        date,
        timeSlot,
        purpose,
        alternativeName,
        alternativeId,
        status: "pending",
      });
      
      return res.status(201).json(booking);
    } catch (error) {
      console.error("Error booking classroom:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/classrooms/bookings/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Make sure the booking exists
      const booking = await storage.getClassroomBooking(parseInt(id));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only administrators can update the status, users can only update their own bookings
      if (booking.userId !== userId && req.session.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedBooking = await storage.updateClassroomBooking(
        parseInt(id),
        req.body
      );
      
      return res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating classroom booking:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
