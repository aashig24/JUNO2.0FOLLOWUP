import {
  User,
  InsertUser,
  LostFoundItem,
  InsertLostFoundItem,
  FacultyMentor,
  InsertFacultyMentor,
  MentorBooking,
  InsertMentorBooking,
  MessTransaction,
  InsertMessTransaction,
  MessBalance,
  InsertMessBalance,
  Course,
  InsertCourse,
  StudentEnrollment,
  InsertStudentEnrollment,
  ClassroomBooking,
  InsertClassroomBooking,
  ClassroomAvailable,
  InsertClassroomAvailable,
  users,
  lostFoundItems,
  facultyMentors,
  mentorBookings,
  messBalances,
  messTransactions,
  courses,
  studentEnrollments,
  classroomBookings,
  classroomAvailable
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Lost and Found operations
  getLostFoundItems(type?: string): Promise<LostFoundItem[]>;
  getLostFoundItem(id: number): Promise<LostFoundItem | undefined>;
  createLostFoundItem(item: InsertLostFoundItem): Promise<LostFoundItem>;
  updateLostFoundItem(id: number, item: Partial<LostFoundItem>): Promise<LostFoundItem | undefined>;
  
  // Faculty Mentor operations
  getFacultyMentors(): Promise<FacultyMentor[]>;
  getFacultyMentor(id: number): Promise<FacultyMentor | undefined>;
  getFacultyMentorByEmail(email: string | undefined): Promise<FacultyMentor | undefined>;
  createFacultyMentor(mentor: InsertFacultyMentor): Promise<FacultyMentor>;
  
  // Mentor Booking operations
  getMentorBookings(userId: number): Promise<MentorBooking[]>;
  getAllMentorBookings(): Promise<MentorBooking[]>;
  getMentorBooking(id: number): Promise<MentorBooking | undefined>;
  createMentorBooking(booking: InsertMentorBooking): Promise<MentorBooking>;
  updateMentorBooking(id: number, booking: Partial<MentorBooking>): Promise<MentorBooking | undefined>;
  
  // Mess Balance operations
  getMessBalance(userId: number): Promise<MessBalance | undefined>;
  createMessBalance(balance: InsertMessBalance): Promise<MessBalance>;
  updateMessBalance(userId: number, balance: Partial<MessBalance>): Promise<MessBalance | undefined>;
  
  // Mess Transaction operations
  getMessTransactions(userId: number): Promise<MessTransaction[]>;
  createMessTransaction(transaction: InsertMessTransaction): Promise<MessTransaction>;
  
  // Course operations
  getCourses(semester?: string): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  getCourseByCode(courseCode: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  
  // Student Enrollment operations
  getStudentEnrollments(userId: number): Promise<StudentEnrollment[]>;
  getEnrolledCourses(userId: number): Promise<Course[]>;
  enrollStudent(enrollment: InsertStudentEnrollment): Promise<StudentEnrollment>;
  updateEnrollment(userId: number, courseId: number, data: Partial<StudentEnrollment>): Promise<StudentEnrollment | undefined>;
  
  // Classroom Booking operations
  getClassroomBookings(userId: number): Promise<ClassroomBooking[]>;
  getAllClassroomBookings(): Promise<ClassroomBooking[]>;
  getClassroomBooking(id: number): Promise<ClassroomBooking | undefined>;
  getBookedClassrooms(date: string, timeSlot: string): Promise<string[]>;
  createClassroomBooking(booking: InsertClassroomBooking): Promise<ClassroomBooking>;
  updateClassroomBooking(id: number, booking: Partial<ClassroomBooking>): Promise<ClassroomBooking | undefined>;
  
  // Classroom Available operations
  getAvailableClassrooms(timeSlot: string): Promise<string[]>;
  setClassroomAvailability(classroom: string, timeSlot: string, isAvailable: boolean): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private lostFoundItems: Map<number, LostFoundItem>;
  private facultyMentors: Map<number, FacultyMentor>;
  private mentorBookings: Map<number, MentorBooking>;
  private messBalances: Map<number, MessBalance>;
  private messTransactions: Map<number, MessTransaction>;
  private courses: Map<number, Course>;
  private studentEnrollments: Map<string, StudentEnrollment>; // composite key: userId-courseId
  private classroomBookings: Map<number, ClassroomBooking>;
  
  private currentUserId: number = 1;
  private currentLostFoundItemId: number = 1;
  private currentFacultyMentorId: number = 1;
  private currentMentorBookingId: number = 1;
  private currentMessBalanceId: number = 1;
  private currentMessTransactionId: number = 1;
  private currentCourseId: number = 1;
  private currentClassroomBookingId: number = 1;

  constructor() {
    this.users = new Map();
    this.lostFoundItems = new Map();
    this.facultyMentors = new Map();
    this.mentorBookings = new Map();
    this.messBalances = new Map();
    this.messTransactions = new Map();
    this.courses = new Map();
    this.studentEnrollments = new Map();
    this.classroomBookings = new Map();
    
    // Initialize with some faculty mentors for demo
    this.seedFacultyMentors();
  }

  private seedFacultyMentors() {
    const mentors: InsertFacultyMentor[] = [
      {
        name: "Dr. John Smith",
        department: "Computer Science",
        email: "john.smith@university.edu",
        office: "CS Building, Room 301",
        specialization: "Artificial Intelligence, Machine Learning",
        availability: JSON.stringify({
          monday: ["10:00-12:00", "14:00-16:00"],
          wednesday: ["10:00-12:00", "14:00-16:00"],
          friday: ["10:00-12:00"]
        }),
        avatar: "https://randomuser.me/api/portraits/men/41.jpg"
      },
      {
        name: "Dr. Emily Johnson",
        department: "Physics",
        email: "emily.johnson@university.edu",
        office: "Physics Building, Room 205",
        specialization: "Quantum Mechanics, Theoretical Physics",
        availability: JSON.stringify({
          tuesday: ["09:00-11:00", "13:00-15:00"],
          thursday: ["09:00-11:00", "13:00-15:00"]
        }),
        avatar: "https://randomuser.me/api/portraits/women/44.jpg"
      },
      {
        name: "Prof. Michael Chen",
        department: "Business Administration",
        email: "michael.chen@university.edu",
        office: "Business Building, Room 412",
        specialization: "Marketing, Entrepreneurship",
        availability: JSON.stringify({
          monday: ["11:00-13:00"],
          wednesday: ["11:00-13:00"],
          friday: ["13:00-15:00"]
        }),
        avatar: "https://randomuser.me/api/portraits/men/33.jpg"
      }
    ];

    mentors.forEach(mentor => {
      this.createFacultyMentor(mentor);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    // Ensure role is set and avatar is null if not provided
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "student",
      accommodation: insertUser.accommodation || "dayscholar", // Default to dayscholar if not provided
      avatar: insertUser.avatar || null 
    };
    this.users.set(id, user);
    
    // Create a default mess balance for the new user
    this.createMessBalance({
      userId: id,
      balance: "500.00",
      mealSwipes: 19,
      totalMealSwipes: 19,
      diningPoints: 200,
      mealPlan: "Premium 19",
      nextBillingDate: "2023-06-01"
    });
    
    return user;
  }

  // Lost and Found operations
  async getLostFoundItems(type?: string): Promise<LostFoundItem[]> {
    const items = Array.from(this.lostFoundItems.values());
    if (type) {
      return items.filter(item => item.type === type);
    }
    return items;
  }

  async getLostFoundItem(id: number): Promise<LostFoundItem | undefined> {
    return this.lostFoundItems.get(id);
  }

  async createLostFoundItem(item: InsertLostFoundItem): Promise<LostFoundItem> {
    const id = this.currentLostFoundItemId++;
    const newItem: LostFoundItem = { 
      ...item, 
      id, 
      createdAt: new Date(),
      status: item.status || "active",
      image: item.image || null
    };
    this.lostFoundItems.set(id, newItem);
    return newItem;
  }

  async updateLostFoundItem(id: number, updateData: Partial<LostFoundItem>): Promise<LostFoundItem | undefined> {
    const item = this.lostFoundItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updateData };
    this.lostFoundItems.set(id, updatedItem);
    return updatedItem;
  }

  // Faculty Mentor operations
  async getFacultyMentors(): Promise<FacultyMentor[]> {
    return Array.from(this.facultyMentors.values());
  }

  async getFacultyMentor(id: number): Promise<FacultyMentor | undefined> {
    return this.facultyMentors.get(id);
  }
  
  async getFacultyMentorByEmail(email: string | undefined): Promise<FacultyMentor | undefined> {
    if (!email) return undefined;
    return Array.from(this.facultyMentors.values()).find(
      mentor => mentor.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createFacultyMentor(mentor: InsertFacultyMentor): Promise<FacultyMentor> {
    const id = this.currentFacultyMentorId++;
    const newMentor: FacultyMentor = { 
      ...mentor, 
      id,
      avatar: mentor.avatar || null 
    };
    this.facultyMentors.set(id, newMentor);
    return newMentor;
  }

  // Mentor Booking operations
  async getMentorBookings(userId: number): Promise<MentorBooking[]> {
    return Array.from(this.mentorBookings.values()).filter(
      booking => booking.userId === userId
    );
  }
  
  async getAllMentorBookings(): Promise<MentorBooking[]> {
    return Array.from(this.mentorBookings.values());
  }

  async getMentorBooking(id: number): Promise<MentorBooking | undefined> {
    return this.mentorBookings.get(id);
  }

  async createMentorBooking(booking: InsertMentorBooking): Promise<MentorBooking> {
    const id = this.currentMentorBookingId++;
    const newBooking: MentorBooking = { 
      ...booking, 
      id, 
      createdAt: new Date(),
      status: booking.status || "pending",
      rejectionReason: booking.rejectionReason || null
    };
    this.mentorBookings.set(id, newBooking);
    return newBooking;
  }

  async updateMentorBooking(id: number, updateData: Partial<MentorBooking>): Promise<MentorBooking | undefined> {
    const booking = this.mentorBookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updateData };
    this.mentorBookings.set(id, updatedBooking);
    return updatedBooking;
  }

  // Mess Balance operations
  async getMessBalance(userId: number): Promise<MessBalance | undefined> {
    return Array.from(this.messBalances.values()).find(
      balance => balance.userId === userId
    );
  }

  async createMessBalance(balance: InsertMessBalance): Promise<MessBalance> {
    const id = this.currentMessBalanceId++;
    const newBalance: MessBalance = { 
      ...balance, 
      id, 
      updatedAt: new Date(),
      balance: balance.balance || "0",
      mealSwipes: balance.mealSwipes || 0,
      totalMealSwipes: balance.totalMealSwipes || 0,
      diningPoints: balance.diningPoints || 0,
      mealPlan: balance.mealPlan || null,
      nextBillingDate: balance.nextBillingDate || null
    };
    this.messBalances.set(id, newBalance);
    return newBalance;
  }

  async updateMessBalance(userId: number, updateData: Partial<MessBalance>): Promise<MessBalance | undefined> {
    const balance = Array.from(this.messBalances.values()).find(
      balance => balance.userId === userId
    );
    
    if (!balance) return undefined;
    
    const updatedBalance = { ...balance, ...updateData, updatedAt: new Date() };
    this.messBalances.set(balance.id, updatedBalance);
    return updatedBalance;
  }

  // Mess Transaction operations
  async getMessTransactions(userId: number): Promise<MessTransaction[]> {
    return Array.from(this.messTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async createMessTransaction(transaction: InsertMessTransaction): Promise<MessTransaction> {
    const id = this.currentMessTransactionId++;
    const newTransaction: MessTransaction = { ...transaction, id, createdAt: new Date() };
    this.messTransactions.set(id, newTransaction);
    
    // Update the user's mess balance
    const balance = await this.getMessBalance(transaction.userId);
    if (balance) {
      const amountNum = parseFloat(transaction.amount);
      
      // For all transactions, update the cash balance
      const currentBalance = parseFloat(balance.balance);
      await this.updateMessBalance(transaction.userId, {
        balance: (currentBalance + amountNum).toFixed(2)
      });
    }
    
    return newTransaction;
  }

  // Course operations
  async getCourses(semester?: string): Promise<Course[]> {
    const allCourses = Array.from(this.courses.values());
    if (semester) {
      return allCourses.filter(course => course.semester === semester);
    }
    return allCourses;
  }

  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCourseByCode(courseCode: string): Promise<Course | undefined> {
    return Array.from(this.courses.values()).find(
      course => course.courseCode === courseCode
    );
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.currentCourseId++;
    const newCourse: Course = {
      ...course,
      id,
      description: course.description || null,
      schedule: course.schedule || JSON.stringify({}),
      room: course.room || "TBD"
    };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  // Student Enrollment operations
  async getStudentEnrollments(userId: number): Promise<StudentEnrollment[]> {
    return Array.from(this.studentEnrollments.values()).filter(
      enrollment => enrollment.userId === userId
    );
  }

  async getEnrolledCourses(userId: number): Promise<Course[]> {
    const enrollments = await this.getStudentEnrollments(userId);
    const courseIds = enrollments.map(enrollment => enrollment.courseId);
    return Array.from(this.courses.values()).filter(
      course => courseIds.includes(course.id)
    );
  }

  async enrollStudent(enrollment: InsertStudentEnrollment): Promise<StudentEnrollment> {
    const enrollmentKey = `${enrollment.userId}-${enrollment.courseId}`;
    const newEnrollment: StudentEnrollment = {
      ...enrollment,
      enrolledAt: new Date(),
      grade: enrollment.grade || null,
      status: enrollment.status || "active"
    };
    this.studentEnrollments.set(enrollmentKey, newEnrollment);
    return newEnrollment;
  }

  async updateEnrollment(userId: number, courseId: number, data: Partial<StudentEnrollment>): Promise<StudentEnrollment | undefined> {
    const enrollmentKey = `${userId}-${courseId}`;
    const enrollment = this.studentEnrollments.get(enrollmentKey);
    
    if (!enrollment) return undefined;
    
    const updatedEnrollment = { ...enrollment, ...data };
    this.studentEnrollments.set(enrollmentKey, updatedEnrollment);
    return updatedEnrollment;
  }

  // Classroom Booking operations
  async getClassroomBookings(userId: number): Promise<ClassroomBooking[]> {
    return Array.from(this.classroomBookings.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllClassroomBookings(): Promise<ClassroomBooking[]> {
    return Array.from(this.classroomBookings.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getClassroomBooking(id: number): Promise<ClassroomBooking | undefined> {
    return this.classroomBookings.get(id);
  }

  async getBookedClassrooms(date: string, timeSlot: string): Promise<string[]> {
    return Array.from(this.classroomBookings.values())
      .filter(booking => 
        booking.date === date && 
        booking.timeSlot === timeSlot &&
        (booking.status === "approved" || booking.status === "pending")
      )
      .map(booking => booking.classroom);
  }

  async createClassroomBooking(booking: InsertClassroomBooking): Promise<ClassroomBooking> {
    const id = this.currentClassroomBookingId++;
    const newBooking: ClassroomBooking = {
      ...booking,
      id,
      createdAt: new Date(),
      status: booking.status || "pending",
      alternativeName: booking.alternativeName || null,
      alternativeId: booking.alternativeId || null
    };
    this.classroomBookings.set(id, newBooking);
    return newBooking;
  }

  async updateClassroomBooking(id: number, updateData: Partial<ClassroomBooking>): Promise<ClassroomBooking | undefined> {
    const booking = this.classroomBookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updateData };
    this.classroomBookings.set(id, updatedBooking);
    return updatedBooking;
  }

  // Classroom Available operations
  async getAvailableClassrooms(timeSlot: string): Promise<string[]> {
    // Special case for 09:30-10:30 time slot
    if (timeSlot === "09:30-10:30") {
      return ["ECR 1", "ECR 2", "ECR 3"];
    }
    
    // Default to all classrooms for other time slots
    return [
      ...Array(18).fill(0).map((_, i) => `ECR ${i + 1}`),
      ...Array(7).fill(0).map((_, i) => `ELT ${i + 1}`)
    ];
  }

  async setClassroomAvailability(classroom: string, timeSlot: string, isAvailable: boolean): Promise<void> {
    // No-op for MemStorage
    return;
  }
}

// Database Storage implementation

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create a default mess balance for the new user
    await this.createMessBalance({
      userId: user.id,
      balance: "500.00",
      mealSwipes: 19,
      totalMealSwipes: 19,
      diningPoints: 200,
      mealPlan: "Premium 19",
      nextBillingDate: "2023-06-01"
    });
    
    return user;
  }
  
  // Lost and Found operations
  async getLostFoundItems(type?: string): Promise<LostFoundItem[]> {
    if (type) {
      return db.select().from(lostFoundItems).where(eq(lostFoundItems.type, type));
    }
    return db.select().from(lostFoundItems);
  }

  async getLostFoundItem(id: number): Promise<LostFoundItem | undefined> {
    const [item] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, id));
    return item || undefined;
  }

  async createLostFoundItem(item: InsertLostFoundItem): Promise<LostFoundItem> {
    const [newItem] = await db.insert(lostFoundItems).values(item).returning();
    return newItem;
  }

  async updateLostFoundItem(id: number, item: Partial<LostFoundItem>): Promise<LostFoundItem | undefined> {
    const [updatedItem] = await db
      .update(lostFoundItems)
      .set(item)
      .where(eq(lostFoundItems.id, id))
      .returning();
    return updatedItem || undefined;
  }
  
  // Faculty Mentor operations
  async getFacultyMentors(): Promise<FacultyMentor[]> {
    return db.select().from(facultyMentors);
  }

  async getFacultyMentor(id: number): Promise<FacultyMentor | undefined> {
    const [mentor] = await db.select().from(facultyMentors).where(eq(facultyMentors.id, id));
    return mentor || undefined;
  }
  
  async getFacultyMentorByEmail(email: string | undefined): Promise<FacultyMentor | undefined> {
    if (!email) return undefined;
    const [mentor] = await db.select().from(facultyMentors).where(eq(facultyMentors.email, email));
    return mentor || undefined;
  }

  async createFacultyMentor(mentor: InsertFacultyMentor): Promise<FacultyMentor> {
    const [newMentor] = await db.insert(facultyMentors).values(mentor).returning();
    return newMentor;
  }
  
  // Mentor Booking operations
  async getMentorBookings(userId: number): Promise<MentorBooking[]> {
    return db.select().from(mentorBookings).where(eq(mentorBookings.userId, userId));
  }
  
  async getAllMentorBookings(): Promise<MentorBooking[]> {
    return db.select().from(mentorBookings);
  }

  async getMentorBooking(id: number): Promise<MentorBooking | undefined> {
    const [booking] = await db.select().from(mentorBookings).where(eq(mentorBookings.id, id));
    return booking || undefined;
  }

  async createMentorBooking(booking: InsertMentorBooking): Promise<MentorBooking> {
    const [newBooking] = await db.insert(mentorBookings).values(booking).returning();
    return newBooking;
  }

  async updateMentorBooking(id: number, booking: Partial<MentorBooking>): Promise<MentorBooking | undefined> {
    const [updatedBooking] = await db
      .update(mentorBookings)
      .set(booking)
      .where(eq(mentorBookings.id, id))
      .returning();
    return updatedBooking || undefined;
  }
  
  // Mess Balance operations
  async getMessBalance(userId: number): Promise<MessBalance | undefined> {
    const [balance] = await db.select().from(messBalances).where(eq(messBalances.userId, userId));
    return balance || undefined;
  }

  async createMessBalance(balance: InsertMessBalance): Promise<MessBalance> {
    const [newBalance] = await db.insert(messBalances).values(balance).returning();
    return newBalance;
  }

  async updateMessBalance(userId: number, balance: Partial<MessBalance>): Promise<MessBalance | undefined> {
    const [updatedBalance] = await db
      .update(messBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(messBalances.userId, userId))
      .returning();
    return updatedBalance || undefined;
  }
  
  // Mess Transaction operations
  async getMessTransactions(userId: number): Promise<MessTransaction[]> {
    return db
      .select()
      .from(messTransactions)
      .where(eq(messTransactions.userId, userId))
      .orderBy(messTransactions.date, messTransactions.time);
  }

  async createMessTransaction(transaction: InsertMessTransaction): Promise<MessTransaction> {
    const [newTransaction] = await db.insert(messTransactions).values(transaction).returning();
    
    // Update the user's mess balance
    const balance = await this.getMessBalance(transaction.userId);
    if (balance) {
      const amountNum = parseFloat(transaction.amount);
      
      // For all transactions, update the balance
      const currentBalance = parseFloat(balance.balance);
      await this.updateMessBalance(transaction.userId, {
        balance: (currentBalance + amountNum).toFixed(2)
      });
    }
    
    return newTransaction;
  }

  // Course operations
  async getCourses(semester?: string): Promise<Course[]> {
    if (semester) {
      return db.select().from(courses).where(eq(courses.semester, semester));
    }
    return db.select().from(courses);
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async getCourseByCode(courseCode: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.courseCode, courseCode));
    return course || undefined;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  // Student Enrollment operations
  async getStudentEnrollments(userId: number): Promise<StudentEnrollment[]> {
    return db.select().from(studentEnrollments).where(eq(studentEnrollments.userId, userId));
  }

  async getEnrolledCourses(userId: number): Promise<Course[]> {
    const enrollments = await this.getStudentEnrollments(userId);
    const courseIds = enrollments.map(enrollment => enrollment.courseId);
    
    if (courseIds.length === 0) {
      return [];
    }
    
    // If only one course, use simple eq, otherwise use inArray
    if (courseIds.length === 1) {
      return db.select().from(courses).where(eq(courses.id, courseIds[0]));
    } else {
      return db.select().from(courses).where(inArray(courses.id, courseIds));
    }
  }

  async enrollStudent(enrollment: InsertStudentEnrollment): Promise<StudentEnrollment> {
    const [newEnrollment] = await db.insert(studentEnrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async updateEnrollment(userId: number, courseId: number, data: Partial<StudentEnrollment>): Promise<StudentEnrollment | undefined> {
    const [updatedEnrollment] = await db
      .update(studentEnrollments)
      .set(data)
      .where(
        and(
          eq(studentEnrollments.userId, userId),
          eq(studentEnrollments.courseId, courseId)
        )
      )
      .returning();
    return updatedEnrollment || undefined;
  }

  // Classroom Booking operations
  async getClassroomBookings(userId: number): Promise<ClassroomBooking[]> {
    return db
      .select()
      .from(classroomBookings)
      .where(eq(classroomBookings.userId, userId))
      .orderBy(desc(classroomBookings.createdAt));
  }

  async getAllClassroomBookings(): Promise<ClassroomBooking[]> {
    return db
      .select()
      .from(classroomBookings)
      .orderBy(desc(classroomBookings.createdAt));
  }

  async getClassroomBooking(id: number): Promise<ClassroomBooking | undefined> {
    const [booking] = await db
      .select()
      .from(classroomBookings)
      .where(eq(classroomBookings.id, id));
    return booking || undefined;
  }

  async getBookedClassrooms(date: string, timeSlot: string): Promise<string[]> {
    const bookings = await db
      .select()
      .from(classroomBookings)
      .where(
        and(
          eq(classroomBookings.date, date),
          eq(classroomBookings.timeSlot, timeSlot),
          inArray(classroomBookings.status, ["pending", "approved"])
        )
      );
    return bookings.map(booking => booking.classroom);
  }

  async createClassroomBooking(booking: InsertClassroomBooking): Promise<ClassroomBooking> {
    const [newBooking] = await db
      .insert(classroomBookings)
      .values(booking)
      .returning();
    return newBooking;
  }

  async updateClassroomBooking(id: number, booking: Partial<ClassroomBooking>): Promise<ClassroomBooking | undefined> {
    const [updatedBooking] = await db
      .update(classroomBookings)
      .set(booking)
      .where(eq(classroomBookings.id, id))
      .returning();
    return updatedBooking || undefined;
  }

  // Classroom Available operations
  async getAvailableClassrooms(timeSlot: string): Promise<string[]> {
    try {
      const availableClassrooms = await db
        .select()
        .from(classroomAvailable)
        .where(and(
          eq(classroomAvailable.timeSlot, timeSlot),
          eq(classroomAvailable.isAvailable, true)
        ));
      
      return availableClassrooms.map(record => record.classroom);
    } catch (error) {
      console.error("Error getting available classrooms:", error);
      return [];
    }
  }

  async setClassroomAvailability(classroom: string, timeSlot: string, isAvailable: boolean): Promise<void> {
    try {
      // Check if record exists
      const existing = await db
        .select()
        .from(classroomAvailable)
        .where(and(
          eq(classroomAvailable.classroom, classroom),
          eq(classroomAvailable.timeSlot, timeSlot)
        ));
      
      if (existing.length > 0) {
        // Update existing record
        await db
          .update(classroomAvailable)
          .set({ isAvailable })
          .where(and(
            eq(classroomAvailable.classroom, classroom),
            eq(classroomAvailable.timeSlot, timeSlot)
          ));
      } else {
        // Insert new record
        await db
          .insert(classroomAvailable)
          .values({
            classroom,
            timeSlot,
            isAvailable
          });
      }
    } catch (error) {
      console.error("Error setting classroom availability:", error);
    }
  }
}

// Export the storage instance - switch to DatabaseStorage
export const storage = new DatabaseStorage();
