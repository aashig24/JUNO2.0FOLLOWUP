import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, facultyMentors } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedFacultyUser() {
  console.log("Starting faculty user seeding...");
  
  try {
    // Check if the faculty user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "arunavinash@mahindrauniversity.edu.in")
    });
    
    if (existingUser) {
      console.log("Faculty user already exists");
      return;
    }
    
    // Create the faculty user
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    const [newUser] = await db.insert(users)
      .values({
        username: "arunavinash@mahindrauniversity.edu.in",
        email: "arunavinash@mahindrauniversity.edu.in",
        password: hashedPassword,
        fullName: "Arun Avinash",
        role: "faculty",
        accommodation: "dayscholar"
      })
      .returning();
      
    console.log(`Created faculty user with ID: ${newUser.id}`);
    
    // Check if faculty mentor entry exists
    const existingMentor = await db.query.facultyMentors.findFirst({
      where: (facultyMentors, { eq }) => eq(facultyMentors.email, "arunavinash@mahindrauniversity.edu.in")
    });
    
    if (existingMentor) {
      console.log("Faculty mentor entry already exists");
      return;
    }
    
    // Create a faculty mentor entry linked to this user
    await db.insert(facultyMentors)
      .values({
        name: "Arun Avinash",
        department: "Computer Science",
        email: "arunavinash@mahindrauniversity.edu.in",
        office: "Block A, Room 203",
        specialization: "Software Engineering",
        availability: JSON.stringify([
          { day: "Monday", slots: ["09:00-10:00", "14:00-15:00"] },
          { day: "Wednesday", slots: ["11:00-12:00", "16:00-17:00"] },
          { day: "Friday", slots: ["10:00-11:00", "15:00-16:00"] }
        ]),
        avatar: null,
      });
    
    console.log("Created faculty mentor entry");
    console.log("Faculty user seeding completed successfully!");
  } catch (error) {
    console.error("Error during faculty user seeding:", error);
  }
}

seedFacultyUser().catch(console.error);