import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").default("student").notNull(),
  accommodation: text("accommodation").default("dayscholar").notNull(), // "dayscholar" or "hosteller"
  avatar: text("avatar"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  accommodation: true,
  avatar: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Lost and Found items
export const lostFoundItems = pgTable("lost_found_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(), // where item was lost/found
  submissionLocation: text("submission_location"), // Ecole or Library
  date: text("date").notNull(),
  type: text("type").notNull(), // "lost" or "found"
  status: text("status").default("active").notNull(), // "active", "claimed", "resolved"
  image: text("image"),
  contactInfo: text("contact_info").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  otherLocation: text("other_location"), // for "Other" location option
});

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).pick({
  userId: true,
  name: true,
  description: true,
  category: true,
  location: true,
  submissionLocation: true,
  date: true,
  type: true,
  status: true,
  image: true,
  contactInfo: true,
  otherLocation: true,
});

// Faculty Mentors
export const facultyMentors = pgTable("faculty_mentors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  email: text("email").notNull(),
  office: text("office").notNull(),
  specialization: text("specialization").notNull(),
  availability: jsonb("availability").notNull(), // Available time slots as JSON
  avatar: text("avatar"),
});

export const insertFacultyMentorSchema = createInsertSchema(facultyMentors).pick({
  name: true,
  department: true,
  email: true,
  office: true, 
  specialization: true,
  availability: true,
  avatar: true,
});

// Mentor Bookings
export const mentorBookings = pgTable("mentor_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mentorId: integer("mentor_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected", "completed"
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMentorBookingSchema = createInsertSchema(mentorBookings).pick({
  userId: true,
  mentorId: true,
  date: true,
  time: true,
  purpose: true,
  status: true,
  rejectionReason: true,
});

// Mess Balance Transactions
export const messTransactions = pgTable("mess_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: text("amount").notNull(), // Can be positive for additions, negative for deductions
  description: text("description").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessTransactionSchema = createInsertSchema(messTransactions).pick({
  userId: true,
  amount: true,
  description: true,
  date: true,
  time: true,
});

// Mess Balance
export const messBalances = pgTable("mess_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: text("balance").notNull().default("0"),
  mealSwipes: integer("meal_swipes").notNull().default(0),
  totalMealSwipes: integer("total_meal_swipes").notNull().default(0),
  diningPoints: integer("dining_points").notNull().default(0),
  mealPlan: text("meal_plan"),
  nextBillingDate: text("next_billing_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMessBalanceSchema = createInsertSchema(messBalances).pick({
  userId: true,
  balance: true,
  mealSwipes: true,
  totalMealSwipes: true,
  diningPoints: true,
  mealPlan: true,
  nextBillingDate: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type LostFoundItem = typeof lostFoundItems.$inferSelect;
export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;

export type FacultyMentor = typeof facultyMentors.$inferSelect;
export type InsertFacultyMentor = z.infer<typeof insertFacultyMentorSchema>;

export type MentorBooking = typeof mentorBookings.$inferSelect;
export type InsertMentorBooking = z.infer<typeof insertMentorBookingSchema>;

export type MessTransaction = typeof messTransactions.$inferSelect;
export type InsertMessTransaction = z.infer<typeof insertMessTransactionSchema>;

export type MessBalance = typeof messBalances.$inferSelect;
export type InsertMessBalance = z.infer<typeof insertMessBalanceSchema>;

// Courses
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  courseCode: text("course_code").notNull().unique(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  credits: integer("credits").notNull(),
  description: text("description"),
  semester: text("semester").notNull(), // e.g., "Fall 2025"
  facultyId: integer("faculty_id").notNull(), // References faculty_mentors
  schedule: text("schedule").notNull(), // JSON string of weekly schedule
  room: text("room").notNull(), // Classroom location
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  courseCode: true,
  name: true,
  department: true,
  credits: true,
  description: true,
  semester: true,
  facultyId: true,
  schedule: true,
  room: true,
});

// Student Course Enrollments - Many-to-Many relation between students and courses
export const studentEnrollments = pgTable("student_enrollments", {
  userId: integer("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  grade: text("grade"),
  status: text("status").default("active").notNull(), // "active", "completed", "dropped"
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.courseId] }),
  };
});

export const insertStudentEnrollmentSchema = createInsertSchema(studentEnrollments).pick({
  userId: true,
  courseId: true,
  grade: true,
  status: true,
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(studentEnrollments),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  faculty: one(facultyMentors, {
    fields: [courses.facultyId],
    references: [facultyMentors.id],
  }),
  enrollments: many(studentEnrollments),
}));

export const studentEnrollmentsRelations = relations(studentEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [studentEnrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [studentEnrollments.courseId],
    references: [courses.id],
  }),
}));

export const facultyMentorsRelations = relations(facultyMentors, ({ many }) => ({
  courses: many(courses),
}));

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type StudentEnrollment = typeof studentEnrollments.$inferSelect;
export type InsertStudentEnrollment = z.infer<typeof insertStudentEnrollmentSchema>;

// Classroom Bookings
export const classroomBookings = pgTable("classroom_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  classroom: text("classroom").notNull(), // ecr1, ecr2, etc.
  date: text("date").notNull(), // YYYY-MM-DD format
  timeSlot: text("time_slot").notNull(), // e.g., "8:30 AM - 9:30 AM"
  alternativeName: text("alternative_name"),
  alternativeId: text("alternative_id"),
  purpose: text("purpose").notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClassroomBookingSchema = createInsertSchema(classroomBookings).pick({
  userId: true,
  classroom: true,
  date: true,
  timeSlot: true,
  alternativeName: true,
  alternativeId: true,
  purpose: true,
  status: true,
});

export const classroomBookingsRelations = relations(classroomBookings, ({ one }) => ({
  user: one(users, {
    fields: [classroomBookings.userId],
    references: [users.id],
  }),
}));

export type ClassroomBooking = typeof classroomBookings.$inferSelect;
export type InsertClassroomBooking = z.infer<typeof insertClassroomBookingSchema>;

// Table for defining available classrooms by time slot
export const classroomAvailable = pgTable("classroom_available", {
  id: serial("id").primaryKey(),
  classroom: text("classroom").notNull(),
  timeSlot: text("time_slot").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const insertClassroomAvailableSchema = createInsertSchema(classroomAvailable).pick({
  classroom: true,
  timeSlot: true,
  isAvailable: true,
});

export type ClassroomAvailable = typeof classroomAvailable.$inferSelect;
export type InsertClassroomAvailable = z.infer<typeof insertClassroomAvailableSchema>;
