// Furnili Management System Configuration
// This configuration loads from environment variables first, with fallbacks for development
// For production deployment: Set these environment variables on your VPS

export const config = {
  // Database Configuration
  // Production: Set DATABASE_URL environment variable
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  
  // Bot Configuration
  // Production: Set TELEGRAM_BOT_TOKEN environment variable (leave empty if not using)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "8388446773:AAGert9QZiJpi90LumzRGKN9XBqGFHveLZg",
  
  // JWT Secret for authentication
  // Production: REQUIRED - Set JWT_SECRET environment variable with a secure random key
  // Security: No insecure fallback - server will fail to start without proper JWT_SECRET
  JWT_SECRET: validateJWTSecret(process.env.JWT_SECRET),
  
  // Server Configuration  
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  
  // WhatsApp Bot Configuration
  WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || "/tmp/whatsapp-session",
  CHROME_USER_DATA_DIR: process.env.CHROME_USER_DATA_DIR || "/tmp/chrome-whatsapp-bot",
  
  // File Storage Paths (Local VPS Storage)
  UPLOAD_PATHS: {
    products: process.env.UPLOAD_PATH_PRODUCTS || "uploads/products/",
    receipts: process.env.UPLOAD_PATH_RECEIPTS || "uploads/receipts/", 
    documents: process.env.UPLOAD_PATH_DOCUMENTS || "uploads/documents/",
    telegram: process.env.UPLOAD_PATH_TELEGRAM || "uploads/telegram/",
    whatsapp: process.env.UPLOAD_PATH_WHATSAPP || "uploads/whatsapp/"
  }
};

// JWT Secret validation function
function validateJWTSecret(jwtSecret?: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (!jwtSecret) {
    if (isDevelopment) {
      console.warn('⚠️  DEVELOPMENT WARNING: No JWT_SECRET set, using development fallback');
      console.warn('🔧 PRODUCTION: Set JWT_SECRET environment variable to a secure random string (minimum 32 characters)');
      return "development-jwt-secret-please-change-in-production-minimum-32-chars";
    } else {
      console.error('🚨 PRODUCTION ERROR: JWT_SECRET environment variable is required but not set');
      console.error('🔧 FIX: Set JWT_SECRET environment variable to a secure random string (minimum 32 characters)');
      console.error('📝 Example: JWT_SECRET="your-very-long-secure-random-jwt-secret-key-here"');
      process.exit(1);
    }
  }
  
  if (jwtSecret.length < 32) {
    console.error('🚨 SECURITY ERROR: JWT_SECRET is too short (minimum 32 characters required)');
    console.error('🔧 FIX: Use a longer, more secure JWT_SECRET');
    console.error('📝 Current length:', jwtSecret.length, 'Required: 32+');
    process.exit(1);
  }
  
  // Check for common insecure defaults
  const insecureDefaults = [
    'your-secret-key-here',
    'your-development-jwt-secret',
    'jwt-secret',
    'secret',
    'development'
  ];
  
  if (insecureDefaults.some(insecure => jwtSecret.toLowerCase().includes(insecure))) {
    console.error('🚨 SECURITY ERROR: JWT_SECRET appears to use an insecure default value');
    console.error('🔧 FIX: Generate a secure random JWT_SECRET');
    console.error('📝 Use: openssl rand -hex 32 or similar to generate a secure secret');
    process.exit(1);
  }
  
  console.log('✅ JWT_SECRET validation passed - Using secure secret');
  return jwtSecret;
}

// Export individual config values for easy access
export const {
  DATABASE_URL,
  TELEGRAM_BOT_TOKEN,
  NODE_ENV,
  PORT,
  WHATSAPP_SESSION_PATH,
  CHROME_USER_DATA_DIR,
  UPLOAD_PATHS,
  JWT_SECRET
} = config;