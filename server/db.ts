import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// FORCE Supabase connection - ignore all environment variables
const SUPABASE_CONNECTION = 'postgresql://postgres.qopynbelowyghyciuofo:Furnili%40123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

// Set DATABASE_URL to our Supabase connection and clear other interfering variables
process.env.DATABASE_URL = SUPABASE_CONNECTION;
delete process.env.PGHOST;
delete process.env.PGPORT;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;

const poolConfig: any = {
  connectionString: SUPABASE_CONNECTION,
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
