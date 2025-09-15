#!/bin/bash

# Furnili Management System - Mobile Build Script
# This script builds the web app and syncs it with Capacitor for mobile deployment

echo "🏗️  Building Furnili Management System for Mobile..."

# Build the web application
echo "📦 Building web application..."
npm run build

# Check if dist/public exists
if [ ! -d "dist/public" ]; then
  echo "❌ Build failed - dist/public directory not found"
  exit 1
fi

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync

echo "✅ Mobile build complete!"
echo ""
echo "Next steps:"
echo "📱 For Android: npx cap open android"
echo "🍎 For iOS: npx cap open ios"
echo "🚀 To run on device: npx cap run android or npx cap run ios"