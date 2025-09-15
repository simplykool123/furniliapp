import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use Supabase database connection with proper URL encoding
const SUPABASE_DATABASE_URL = "postgresql://postgres.qopynbelowyghyciuofo:Furnili%40123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Set DATABASE_URL for consistency with Drizzle migrations
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = SUPABASE_DATABASE_URL;
}

if (!SUPABASE_DATABASE_URL) {
  throw new Error(
    "Supabase DATABASE_URL must be set. Please check your Supabase connection.",
  );
}

// Log connection attempt for debugging
console.log('Connecting to Supabase database with URL-encoded credentials...');

// Use Supabase database connection
export const pool = new Pool({ 
  connectionString: SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test connection with better error handling
pool.on('connect', () => {
  console.log('✓ Connected to Supabase database successfully');
});

pool.on('error', (err) => {
  console.error('✗ Supabase database connection error:', err.message);
  console.error('Please verify your Supabase connection settings');
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
    console.error('Please check your Supabase connection settings');
  }
})();

export const db = drizzle(pool, { schema });
