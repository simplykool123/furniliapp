import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use Supabase connection directly - your original database
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const poolConfig: any = {
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✓ Connected to Supabase database successfully');
});

pool.on('error', (err) => {
  console.error('✗ Supabase database connection error:', err.message);
});

// Test initial connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Initial Supabase connection test successful');
    client.release();
  } catch (err) {
    const error = err as Error;
    console.error('✗ Initial Supabase connection failed:', error.message);
  }
})();

export const db = drizzle(pool, { schema });
