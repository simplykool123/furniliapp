# 📱 Mobile App Deployment Guide

## ✅ Current Status
Your Furnili Management System is **ready for mobile deployment**! The GitHub Actions workflows are properly configured and all dependencies are in place.

## 🚀 Quick Deploy

### For Testing (Debug APK)
1. Go to **Actions** tab in your GitHub repository
2. Select **Build Android APK** workflow 
3. Click **Run workflow** → **Run workflow**
4. Download the generated APK from Artifacts

### For Production (Signed APK/IPA)
Set up signing certificates first (see below), then push to `main` branch or create a release tag.

## 📋 Required GitHub Secrets

### Android Signing (for Play Store)
Add these secrets in **Settings** → **Secrets and variables** → **Actions**:

```
ANDROID_KEYSTORE_BASE64     # Base64 encoded keystore file
ANDROID_KEYSTORE_PASSWORD   # Keystore password  
ANDROID_KEY_ALIAS          # Key alias name
ANDROID_KEY_PASSWORD       # Key password
```

**Generate Android keystore:**
```bash
# Generate keystore (run this locally)
keytool -genkey -v -keystore android-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias furnili-key

# Convert to base64 for GitHub secrets
base64 -i android-release.keystore | pbcopy  # macOS
base64 android-release.keystore              # Linux/Windows
```

### iOS Signing (for App Store)
Add these secrets in **Settings** → **Secrets and variables** → **Actions**:

```
IOS_CERTIFICATE_BASE64        # Base64 encoded .p12 certificate
IOS_CERTIFICATE_PASSWORD      # Certificate password
IOS_PROVISION_PROFILE_BASE64  # Base64 encoded .mobileprovision
IOS_KEYCHAIN_PASSWORD         # Any secure password
```

**Get iOS certificates:**
1. Download distribution certificate (.p12) from Apple Developer
2. Download provisioning profile (.mobileprovision)
3. Convert to base64:
```bash
base64 -i certificate.p12 | pbcopy
base64 -i profile.mobileprovision | pbcopy
```

## 🛠 Build Configuration

### Supported Build Types

#### Android
- ✅ **Debug APK** - For testing (no signing required)
- ✅ **Release APK** - For direct installation (requires signing)
- ✅ **Release AAB** - For Google Play Store (requires signing)

#### iOS  
- ✅ **Simulator App** - For iOS Simulator testing
- ✅ **Device IPA** - For TestFlight/App Store (requires certificates)

### Build Triggers
- **Manual**: Click "Run workflow" in GitHub Actions
- **Push to main**: Automatically builds when code is pushed
- **Release tags**: Create tag like `v1.0.0` for version releases
- **Pull requests**: Builds for testing (Android only)

## 📱 App Configuration

### Current App Settings
- **App ID**: `com.furnili.management`
- **App Name**: `Furnili Management`  
- **Version**: Auto-generated from package.json
- **Permissions**: Camera, File Storage, Network

### Customization
Edit `capacitor.config.ts` to modify:
- App icon and splash screen
- App permissions
- Plugin configurations
- URL schemes

## 🚀 Deployment Workflow

### 1. Development Testing
```bash
# Test locally
npm run build
npx cap run android    # Android device/emulator
npx cap run ios        # iOS simulator
```

### 2. GitHub Actions Build
1. Push code to main branch
2. GitHub automatically builds APK/IPA
3. Download from Actions → Artifacts
4. Install on device for testing

### 3. Store Deployment  
1. **Android**: Upload AAB to Google Play Console
2. **iOS**: Upload IPA to App Store Connect via Xcode

## 🔧 Troubleshooting

### Build Fails
- Check **Actions** tab for detailed error logs
- Verify all required secrets are set correctly
- Ensure certificates haven't expired

### APK Won't Install
- Enable "Unknown sources" in Android settings
- Check if APK is signed (release builds require keystore)

### iOS Build Issues
- Verify provisioning profile matches bundle ID
- Check certificate validity in Apple Developer
- Ensure Xcode version compatibility

### Common Fixes
```bash
# Clear Capacitor cache
npx cap clean
npx cap sync

# Rebuild native projects
cd android && ./gradlew clean
cd ios/App && rm -rf Pods && pod install
```

## 📊 Build Performance (2025)

| Platform | Build Time | GitHub Minutes | Cost (Private Repo) |
|----------|------------|----------------|-------------------|
| Android  | 4-6 min    | 1-2 minutes    | ~$0.03           |
| iOS      | 10-15 min  | 10-15 minutes  | ~$0.80           |

**Cost Optimization:**
- Use manual triggers for testing
- Build only when needed
- Public repos get unlimited minutes

## 🎯 Next Steps

### Immediate (Ready Now)
1. **Set up Android keystore** → Generate production APKs
2. **Test debug builds** → Verify functionality  
3. **Configure app icons** → Customize branding

### App Store Preparation  
1. **Google Play Console** → Set up developer account ($25 one-time)
2. **Apple Developer** → Set up account ($99/year)
3. **App Store listings** → Screenshots, descriptions
4. **Privacy policies** → Required for store approval

### Advanced Features
- **Over-the-air updates** with Capacitor Live Updates
- **Push notifications** for real-time alerts  
- **Offline synchronization** for field work
- **Biometric authentication** for security

## 📞 Support

Your mobile deployment is **production-ready**! The workflows handle:
- ✅ Multi-platform builds (Android + iOS)
- ✅ Automatic signing and certificates  
- ✅ Error handling and cleanup
- ✅ Artifact storage and download
- ✅ Version management

**Status**: Ready to deploy mobile apps! 🚀