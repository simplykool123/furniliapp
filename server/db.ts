import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Database configuration with environment variable support and fallbacks
function getDatabaseConfig() {
  // Priority 1: Use DATABASE_URL environment variable if provided
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL from environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      isCloud: process.env.DATABASE_URL.includes('supabase.com') || 
               process.env.DATABASE_URL.includes('neon.tech') ||
               process.env.DATABASE_URL.includes('amazonaws.com'),
    };
  }

  // Priority 2: Build connection string from individual environment variables
  if (process.env.DB_HOST || process.env.POSTGRES_HOST) {
    const host = process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.DB_PORT || process.env.POSTGRES_PORT || '5432';
    const database = process.env.DB_NAME || process.env.POSTGRES_DB || 'furnili_db';
    const user = process.env.DB_USER || process.env.POSTGRES_USER || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '';
    
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('Using constructed DATABASE_URL from individual environment variables');
    return { connectionString, isCloud: false };
  }

  // Priority 3: Local PostgreSQL fallback for VPS deployment
  console.log('No database configuration found in environment, using local PostgreSQL fallback');
  const localConnectionString = `postgresql://postgres:postgres@localhost:5432/furnili_db`;
  return { connectionString: localConnectionString, isCloud: false };
}

const dbConfig = getDatabaseConfig();

// Set DATABASE_URL for consistency with Drizzle migrations
process.env.DATABASE_URL = dbConfig.connectionString;

// Validate database configuration
if (!dbConfig.connectionString) {
  throw new Error(
    "Database connection string could not be determined. Please set DATABASE_URL or individual database environment variables (DB_HOST, DB_USER, etc.)",
  );
}

// Log connection attempt for debugging (hide sensitive info)
const sanitizedUrl = dbConfig.connectionString.replace(/:[^:@]*@/, ':***@');
console.log(`Connecting to ${dbConfig.isCloud ? 'cloud' : 'local'} PostgreSQL database: ${sanitizedUrl}`);

// Configure connection pool with appropriate settings for cloud vs local
const poolConfig: any = {
  connectionString: dbConfig.connectionString,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 2,
};

// Cloud databases typically require SSL
if (dbConfig.isCloud) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

export const pool = new Pool(poolConfig);

// Test connection with better error handling
pool.on('connect', () => {
  console.log(`✓ Connected to ${dbConfig.isCloud ? 'cloud' : 'local'} PostgreSQL database successfully`);
});

pool.on('error', (err) => {
  console.error(`✗ PostgreSQL database connection error:`, err.message);
  
  if (!dbConfig.isCloud) {
    console.error('Local PostgreSQL connection failed. Please ensure:');
    console.error('  1. PostgreSQL is installed and running');
    console.error('  2. Database "furnili_db" exists');
    console.error('  3. User "postgres" has access');
    console.error('  4. Or set proper environment variables (DATABASE_URL, DB_HOST, etc.)');
  } else {
    console.error('Cloud database connection failed. Please verify your connection settings');
  }
});

// Test initial connection
(async () => {
  try {
    const client = await pool.connect();
    console.log(`✓ Initial ${dbConfig.isCloud ? 'cloud' : 'local'} PostgreSQL connection test successful`);
    client.release();
  } catch (err) {
    const error = err as Error;
    console.error(`✗ Initial PostgreSQL connection failed:`, error.message);
    
    if (!dbConfig.isCloud) {
      console.error('\n=== Local PostgreSQL Setup Instructions ===');
      console.error('For VPS deployment, ensure PostgreSQL is installed and configured:');
      console.error('  sudo apt update && sudo apt install postgresql postgresql-contrib');
      console.error('  sudo -u postgres createdb furnili_db');
      console.error('  sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'postgres\';"');
      console.error('');
      console.error('Or set environment variables for custom configuration:');
      console.error('  export DATABASE_URL="postgresql://user:password@host:port/database"');
      console.error('  export DB_HOST=localhost');
      console.error('  export DB_PORT=5432');
      console.error('  export DB_NAME=furnili_db');
      console.error('  export DB_USER=postgres');
      console.error('  export DB_PASSWORD=your_password');
    }
  }
})();

export const db = drizzle(pool, { schema });
