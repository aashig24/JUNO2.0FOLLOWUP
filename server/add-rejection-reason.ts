import { pool } from "./db";

async function addRejectionReasonColumn() {
  console.log("Adding rejection_reason column to mentor_bookings table...");
  
  try {
    // First, check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mentor_bookings' AND column_name = 'rejection_reason'
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    
    if (columnCheck.rows.length > 0) {
      console.log("rejection_reason column already exists, skipping creation.");
      return;
    }
    
    // Add the column to the table
    const addColumnQuery = `
      ALTER TABLE mentor_bookings
      ADD COLUMN rejection_reason TEXT
    `;
    
    await pool.query(addColumnQuery);
    console.log("Successfully added rejection_reason column to mentor_bookings table!");
    
  } catch (error) {
    console.error("Error adding rejection_reason column:", error);
    throw error;
  }
}

// Run the migration
addRejectionReasonColumn()
  .then(() => {
    console.log("Rejection reason migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });