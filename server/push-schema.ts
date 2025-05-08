import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './db';

// This pushes the schema directly to the database
async function pushSchema() {
  try {
    console.log('Pushing schema to database...');
    
    // Create schema if needed
    await db.execute(`CREATE SCHEMA IF NOT EXISTS public;`);
    
    // Create the users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "fullName" TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        accommodation TEXT NOT NULL DEFAULT 'dayscholar',
        avatar TEXT
      );
    `);
    
    // Add accommodation column if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS accommodation TEXT NOT NULL DEFAULT 'dayscholar';
      `);
    } catch (e) {
      console.log('Accommodation column might already exist, continuing');
    }
    
    // Create the lost_found_items table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lost_found_items (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        "contactInfo" TEXT NOT NULL,
        status TEXT NOT NULL,
        image TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create the faculty_mentors table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS faculty_mentors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT NOT NULL,
        office TEXT NOT NULL,
        specialization TEXT NOT NULL,
        availability TEXT NOT NULL,
        avatar TEXT
      );
    `);
    
    // Create the mentor_bookings table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mentor_bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "mentorId" INTEGER NOT NULL REFERENCES faculty_mentors(id),
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create the mess_balances table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mess_balances (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) UNIQUE,
        balance TEXT NOT NULL,
        "mealSwipes" INTEGER NOT NULL,
        "totalMealSwipes" INTEGER NOT NULL,
        "diningPoints" INTEGER NOT NULL,
        "mealPlan" TEXT,
        "nextBillingDate" TEXT,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create the mess_transactions table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mess_transactions (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        amount TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create the courses table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        credits INTEGER NOT NULL,
        semester TEXT NOT NULL,
        faculty_id INTEGER NOT NULL REFERENCES faculty_mentors(id),
        schedule TEXT NOT NULL,
        room TEXT NOT NULL,
        description TEXT
      );
    `);
    
    // Create the student_enrollments table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        user_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        status TEXT NOT NULL,
        enrolled_at TIMESTAMP NOT NULL,
        grade TEXT,
        PRIMARY KEY (user_id, course_id)
      );
    `);
    
    console.log('Schema pushed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  }
}

pushSchema();