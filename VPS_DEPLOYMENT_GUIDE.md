# 🚀 Secure VPS Deployment Guide

Your Furnili Management System is now **100% secure and portable** for any VPS deployment!

## 🔒 Security Update - No More Hardcoded Credentials!

**✅ SECURITY ISSUE RESOLVED**: The system now uses environment variables for sensitive data.

## ✅ What's Already Configured:

- ✅ **Secure Configuration**: Environment variables with development fallbacks
- ✅ **WhatsApp Bot**: Configured and working
- ✅ **Database Connection**: Ready to use with any PostgreSQL database
- ✅ **Local File Storage**: All uploads saved to local `uploads/` folders
- ✅ **No Cloud Dependencies**: Everything runs on your VPS
- ✅ **JWT Authentication**: Secure token-based authentication

## 🎯 Deploy to ANY VPS (Hostinger, DigitalOcean, AWS, etc.)

### Step 1: Set Environment Variables on Your VPS

**IMPORTANT**: The application now loads sensitive data from environment variables for security.

Set these environment variables on your VPS:

```bash
# Database Configuration
export DATABASE_URL="postgresql://username:password@your-vps-db:5432/furnili_db"

# Bot Configuration (replace with your actual token)
export TELEGRAM_BOT_TOKEN="your-actual-telegram-bot-token"

# JWT Secret (IMPORTANT: Generate a secure random key for production)
export JWT_SECRET="your-secure-random-jwt-secret-key"

# Server Configuration
export NODE_ENV="production"
export PORT="5000"

# WhatsApp Bot Configuration (optional)
export WHATSAPP_SESSION_PATH="/var/www/whatsapp-session"
export CHROME_USER_DATA_DIR="/var/www/chrome-data"
```

**Generate a secure JWT secret:**
```bash
# Generate a random 64-character secret
openssl rand -hex 32
```

### Step 2: VPS Commands

```bash
# 1. Upload your project to VPS
# 2. Install Node.js and PostgreSQL
sudo apt update
sudo apt install nodejs npm postgresql

# 3. Install dependencies
npm install

# 4. Create upload directories
mkdir -p uploads/{products,receipts,documents,telegram,whatsapp}

# 5. Setup database
npm run db:push

# 6. Start the application with environment variables
NODE_ENV=production \
DATABASE_URL="your-database-url" \
TELEGRAM_BOT_TOKEN="your-bot-token" \
JWT_SECRET="your-jwt-secret" \
npm run start
```

### Step 3: Production Deployment Options

#### Option A: Using systemd (Recommended)
```bash
# Create systemd service file
sudo nano /etc/systemd/system/furnili.service
```

```ini
[Unit]
Description=Furnili Management System
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node dist/index.js
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DATABASE_URL=your-database-url
Environment=TELEGRAM_BOT_TOKEN=your-bot-token
Environment=JWT_SECRET=your-jwt-secret
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Option B: Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start with environment variables
NODE_ENV=production \
DATABASE_URL="your-database-url" \
TELEGRAM_BOT_TOKEN="your-bot-token" \
JWT_SECRET="your-jwt-secret" \
pm2 start dist/index.js --name furnili
```

### Step 4: Domain Setup (Optional)
- Point your domain to VPS IP
- Setup reverse proxy with Nginx
- Add SSL certificate

## 🔧 Key Features:

- ✅ **Secure Configuration**: Environment variables for sensitive data
- ✅ **Development Fallbacks**: Works locally without configuration
- ✅ **Local Storage Only**: No cloud dependencies
- ✅ **Database Portable**: Works with any PostgreSQL instance
- ✅ **Production Ready**: Secure and optimized for VPS deployment

## 🎉 That's It!

Your app will work securely on any VPS with:
1. ✅ Environment variables for secrets
2. ✅ Fallback values for development
3. ✅ No hardcoded credentials in code

**Secure deployment made easy!** 🎯