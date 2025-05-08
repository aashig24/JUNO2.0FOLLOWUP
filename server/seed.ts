import { db } from "./db";
import { users, facultyMentors, messBalances, messTransactions, lostFoundItems, courses, studentEnrollments } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Define interface for meal types
interface MealType {
  description: string;
  time: string;
}

// Helper function to create mess data for a user
async function createMessDataForUser(userId: number, isNew: boolean = false) {
  // Check if user already has mess balance
  const existingBalance = await db.select().from(messBalances).where(eq(messBalances.userId, userId));
  
  if (existingBalance.length === 0) {
    // Create mess balance with 10,000 rupees for dayscholars
    await db.insert(messBalances).values({
      userId: userId,
      balance: "10000.00",
      mealSwipes: 30,
      totalMealSwipes: 60,
      diningPoints: 500,
      mealPlan: "Standard Dayscholar Plan",
      nextBillingDate: "2025-06-01"
    });
    console.log(`Mess balance created for user ${userId}`);
    
    // Add transactions only for new users to avoid duplicates
    if (isNew) {
      await createTransactions(userId);
    }
  } else {
    console.log(`Mess balance already exists for user ${userId}`);
    
    // For existing users, let's update their balance to 10,000
    await db.update(messBalances)
      .set({ balance: "10000.00" })
      .where(eq(messBalances.userId, userId));
    
    // Clear existing transactions and add new ones for our test users
    if ((userId === 3 || userId === 4) && isNew === false) {
      // Delete existing transactions
      await db.delete(messTransactions).where(eq(messTransactions.userId, userId));
      
      // Create new transactions
      await createTransactions(userId);
    }
  }
}

// Function to create transaction data for users
async function createTransactions(userId: number) {
  // Current date in YYYY-MM-DD format
  const today = new Date();
  const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1; // Days since last Monday
  
  // Get Monday of current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOffset);
  
  // Meal types and times for the whole week
  const mealTypes: MealType[] = [
    { description: "Breakfast", time: "08:30" },
    { description: "Lunch", time: "12:30" },
    { description: "Snacks", time: "16:00" },
    { description: "Dinner", time: "19:30" }
  ];
  
  // Create week of transactions with consistent 25 rupee deductions for all meals
  let transactions: {
    userId: number;
    amount: string;
    description: string;
    date: string;
    time: string;
  }[] = [];
  
  // For each day of the week (Monday to Sunday)
  for (let day = 0; day < 7; day++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + day);
    
    // Customize which meals to include based on the user and day of week
    // Different patterns for different users
    let mealsToInclude: number[] = [];
    
    // For Sanjana (user ID 3) - More meals (higher deduction)
    if (userId === 3) {
      if (day === 0 || day === 2 || day === 4) { // Monday, Wednesday, Friday
        mealsToInclude = [0, 1, 2, 3]; // All meals - Breakfast, Lunch, Snacks, Dinner
      } else if (day === 1 || day === 3) { // Tuesday, Thursday
        mealsToInclude = [0, 1, 2]; // Breakfast, Lunch, Snacks
      } else if (day === 5) { // Saturday
        mealsToInclude = [0, 1, 3]; // Breakfast, Lunch, Dinner
      } else { // Sunday
        mealsToInclude = [2, 3]; // Snacks, Dinner
      }
    } 
    // For Harshitha (user ID 4) - Fewer meals (lower deduction)
    else if (userId === 4) {
      if (day === 0 || day === 4) { // Monday, Friday
        mealsToInclude = [1]; // Only Lunch
      } else if (day === 1 || day === 3) { // Tuesday, Thursday
        mealsToInclude = [1, 3]; // Lunch, Dinner
      } else if (day === 2) { // Wednesday
        mealsToInclude = [0, 1]; // Breakfast, Lunch
      } else if (day === 5) { // Saturday
        mealsToInclude = [3]; // Only Dinner
      } else { // Sunday
        mealsToInclude = []; // No meals
      }
    }
    // Default for other users
    else {
      // Just include lunch on weekdays
      if (day < 5) {
        mealsToInclude = [1];
      }
    }
    
    // Add the meals for this day
    for (const mealIndex of mealsToInclude) {
      const meal = mealTypes[mealIndex];
      transactions.push({
        userId: userId,
        amount: "-25.00", // Fixed 25 rupees per meal
        description: meal.description,
        date: formatDate(date),
        time: meal.time
      });
    }
  }
  
  // Insert all transactions
  for (const transaction of transactions) {
    await db.insert(messTransactions).values(transaction);
  }
  console.log(`${userId === 3 ? "Recreated" : "Created"} ${transactions.length} meal transactions for user ${userId}`);
}

// Helper function to enroll a student in courses
async function enrollStudentInCourses(studentId: number, courseIds: number[]) {
  const existingEnrollments = await db.select().from(studentEnrollments).where(eq(studentEnrollments.userId, studentId));
  
  if (existingEnrollments.length === 0) {
    // Enroll the student in all seeded courses
    for (const courseId of courseIds) {
      await db.insert(studentEnrollments).values({
        userId: studentId,
        courseId: courseId,
        status: "active",
        enrolledAt: new Date(),
        grade: null
      });
    }
    console.log(`Student ${studentId} enrolled in ${courseIds.length} courses`);
  } else {
    console.log(`Student ${studentId} enrollments already exist`);
  }
}

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");
    
    // Seed users (existing user + the 3 new users)
    
    // Check for existing test users
    const existingUsers = await db.select().from(users).where(eq(users.username, "testuser"));
    const existingSanjana = await db.select().from(users).where(eq(users.email, "se22uari040@mahindrauniversity.edu.in"));
    const existingHarshitha = await db.select().from(users).where(eq(users.email, "se22uari031@mahindrauniversity.edu.in"));
    const existingAashi = await db.select().from(users).where(eq(users.email, "se22uari003@mahindrauniversity.edu.in"));
    
    let userId: number;
    let sanjanaId: number | null = null;
    let harshithaId: number | null = null;
    let aashiId: number | null = null;
    
    // Create the original test user if it doesn't exist
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash("password123", 10);
      const [user] = await db.insert(users).values({
        username: "testuser",
        password: hashedPassword,
        email: "testuser@iit.edu",
        fullName: "Rajesh Kumar",
        role: "student",
        accommodation: "dayscholar"
      }).returning();
      
      userId = user.id;
      console.log("Test user created:", userId);
    } else {
      userId = existingUsers[0].id;
      console.log("Test user already exists");
    }
    
    // Create Sanjana (dayscholar) user if not exists
    if (existingSanjana.length === 0) {
      const hashedPassword = await bcrypt.hash("se22uari040", 10);
      const [user] = await db.insert(users).values({
        username: "se22uari040@mahindrauniversity.edu.in",
        password: hashedPassword,
        email: "se22uari040@mahindrauniversity.edu.in",
        fullName: "Sanjana",
        role: "student",
        accommodation: "dayscholar"
      }).returning();
      
      sanjanaId = user.id;
      console.log("Sanjana (dayscholar) user created:", sanjanaId);
    } else {
      sanjanaId = existingSanjana[0].id;
      console.log("Sanjana user already exists");
    }
    
    // Create Harshitha (dayscholar) user if not exists
    if (existingHarshitha.length === 0) {
      const hashedPassword = await bcrypt.hash("se22uari031", 10);
      const [user] = await db.insert(users).values({
        username: "se22uari031@mahindrauniversity.edu.in",
        password: hashedPassword,
        email: "se22uari031@mahindrauniversity.edu.in",
        fullName: "Harshitha",
        role: "student",
        accommodation: "dayscholar"
      }).returning();
      
      harshithaId = user.id;
      console.log("Harshitha (dayscholar) user created:", harshithaId);
    } else {
      harshithaId = existingHarshitha[0].id;
      console.log("Harshitha user already exists");
    }
    
    // Create Aashi (hosteller) user if not exists
    if (existingAashi.length === 0) {
      const hashedPassword = await bcrypt.hash("se22uari003", 10);
      const [user] = await db.insert(users).values({
        username: "se22uari003@mahindrauniversity.edu.in",
        password: hashedPassword,
        email: "se22uari003@mahindrauniversity.edu.in",
        fullName: "Aashi",
        role: "student",
        accommodation: "hosteller"
      }).returning();
      
      aashiId = user.id;
      console.log("Aashi (hosteller) user created:", aashiId);
    } else {
      aashiId = existingAashi[0].id;
      console.log("Aashi user already exists");
    }
    
    // Create mess data for dayscholar users
    
    // Create mess data for all dayscholar users
    if (userId) {
      await createMessDataForUser(userId);
    }
    
    if (sanjanaId) {
      await createMessDataForUser(sanjanaId, existingSanjana.length === 0);
    }
    
    if (harshithaId) {
      await createMessDataForUser(harshithaId, existingHarshitha.length === 0);
    }
    
    // Rest of the seed data (Lost and Found, Faculty Mentors, etc.)
    // The code would look the same as the existing seed.ts file

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Export the function to be called from index.ts
export default seedDatabase;
