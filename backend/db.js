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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        member_name VARCHAR(100) NOT NULL,
        subscription JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        move_in_date DATE,
        move_out_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure all required columns exist even if members table was created with an older schema
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS move_in_date DATE;`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS move_out_date DATE;`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    // Seed default active household members safely without relying on constraint names
    await pool.query(`
      INSERT INTO members (name, status, move_in_date)
      SELECT n.name, 'active', '2024-01-01'::DATE
      FROM (VALUES 
        ('Gunal'), ('Gopi'), ('Sathish'), ('Sekar'), ('Vishnu'), ('Kumar'), ('Hemu')
      ) AS n(name)
      WHERE NOT EXISTS (SELECT 1 FROM members m WHERE LOWER(m.name) = LOWER(n.name));
    `);

    // Safely add month and year columns to support monthly history tracking
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month INTEGER;`);
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS year INTEGER;`);

    // Safely add member_id column to expenses table
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS member_id INTEGER;`);

    // Backfill month and year for existing records based on their purchase_date
    await pool.query(`
      UPDATE expenses 
      SET month = EXTRACT(MONTH FROM purchase_date), 
          year = EXTRACT(YEAR FROM purchase_date) 
      WHERE month IS NULL OR year IS NULL;
    `);

    // Ensure any existing expense member names exist in members table
    await pool.query(`
      INSERT INTO members (name, status, move_in_date)
      SELECT DISTINCT e.member_name, 'active', '2024-01-01'::DATE
      FROM expenses e
      WHERE e.member_name IS NOT NULL 
        AND TRIM(e.member_name) != ''
        AND NOT EXISTS (SELECT 1 FROM members m WHERE LOWER(m.name) = LOWER(e.member_name));
    `);

    // Backfill member_id for existing expenses
    await pool.query(`
      UPDATE expenses e
      SET member_id = m.id
      FROM members m
      WHERE LOWER(e.member_name) = LOWER(m.name) AND e.member_id IS NULL;
    `);

    // Create indexes for faster queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_expenses_member_id ON expenses(member_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_member_name ON expenses(member_name);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchase_date ON expenses(purchase_date);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_month_year ON expenses(month, year);`);
    
    // New performance optimizations indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_member_month_year ON expenses(member_name, month, year);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_push_member_name ON push_subscriptions(member_name);`);

    // Supabase RLS Security Lockdown for members table
    try {
      await pool.query(`ALTER TABLE IF EXISTS members ENABLE ROW LEVEL SECURITY;`);
      await pool.query(`REVOKE ALL ON TABLE members FROM anon, authenticated;`);
    } catch (_rlsErr) {
      // Non-fatal if RLS or roles don't exist in local/mock environments
    }

    // Deduplicate existing push_subscriptions based on endpoint
    const cleanupResult = await pool.query(`
      DELETE FROM push_subscriptions a USING push_subscriptions b
      WHERE a.id > b.id AND a.subscription->>'endpoint' = b.subscription->>'endpoint';
    `);
    if (cleanupResult.rowCount > 0) {
      console.log(`[PUSH] Cleaned up ${cleanupResult.rowCount} duplicate subscriptions from database.`);
    }

    console.log('PostgreSQL Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization warning/failure:', error);
    // Never crash the entire server in production - keep serving requests
  }
};

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
