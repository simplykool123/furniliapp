# 📱 Simple Mobile Wrapper Commands

Your Furnili app is now ready as a mobile wrapper! Here are the super simple commands:

## 🔨 One-Command Mobile Builds

### Android APK:
```bash
# Build everything and open Android Studio
npm run build && npx cap sync android && npx cap open android
```

### iOS App:
```bash
# Build everything and open Xcode
npm run build && npx cap sync ios && npx cap open ios
```

## 📋 Quick Steps:

### For Android APK:
1. Run: `npm run build && npx cap sync android && npx cap open android`
2. Android Studio will open
3. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. Wait for build to complete
5. APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

### For iOS App:
1. Run: `npm run build && npx cap sync ios && npx cap open ios` 
2. Xcode will open
3. Connect your device or use simulator
4. Click the Play button to build and install
5. Or use **Product → Archive** for App Store

## 🎯 What This Creates:
- **Wrapper App**: Your web app runs inside a native mobile container
- **Native Features**: Camera, file system, push notifications all work
- **App Store Ready**: Can be published to Google Play and Apple App Store
- **No Code Changes**: Your existing web app works as-is

## 🔧 If You Need to Rebuild:
```bash
# Quick sync after web changes
npm run build && npx cap sync

# Full rebuild if issues
rm -rf android ios
npx cap add android
npx cap add ios
npm run build && npx cap sync
```

Your app is now mobile-ready! 🚀