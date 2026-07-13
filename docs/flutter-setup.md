# Flutter Mobile Setup

## Requirements
- Flutter SDK 3.x
- Android Studio / Android SDK
- Java Development Kit (JDK) 17+

## Local Development

1. Start the local backend (FastAPI) on port 8000.
2. Ensure you have the Android emulator running or a device connected via USB/Wi-Fi.

```bash
cd apps/mobile
flutter pub get

# Run the app pointing to local backend
# Note: For Android emulators, 10.0.2.2 refers to the host machine's localhost
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

## Building for Production (Android APK)

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://vibegpt.yourdomain.com
```

The APK will be available at `build/app/outputs/flutter-apk/app-release.apk`.
