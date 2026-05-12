const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
// For local development, we fallback to a placeholder. In production, DATABASE_URL must be set.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');

    // Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      );
    `);

    // Insert default settings
    await pool.query(`
      INSERT INTO settings (setting_key, setting_value) 
      VALUES ('monthly_rent', '17380')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        purchase_date TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safely add month and year columns to support monthly history tracking
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month INTEGER;`);
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS year INTEGER;`);

    // Backfill month and year for existing records based on their purchase_date
    await pool.query(`
      UPDATE expenses 
      SET month = EXTRACT(MONTH FROM purchase_date), 
          year = EXTRACT(YEAR FROM purchase_date) 
      WHERE month IS NULL OR year IS NULL;
    `);

    // Create indexes for faster queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_member_name ON expenses(member_name);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchase_date ON expenses(purchase_date);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_month_year ON expenses(month, year);`);

    console.log('PostgreSQL Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
