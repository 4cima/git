# APK Downloads Directory

## Instructions

Place your APK file here with the following naming convention:
- `online-cinema-v{VERSION}.apk`

Example:
- `online-cinema-v1.0.0.apk`
- `online-cinema-v1.1.0.apk`

## Current Version

Update the `VITE_APK_DOWNLOAD_URL` in `.env` to point to the latest version.

## File Size Recommendations

- Keep APK size under 50MB for faster downloads
- Use Android App Bundle (.aab) for Play Store distribution
- Use APK (.apk) for direct downloads

## Security

- Always sign your APK with a release keystore
- Never commit the keystore file to git
- Keep the keystore password secure

## Testing

Before uploading:
1. Test installation on multiple Android devices
2. Verify all features work correctly
3. Check for any crashes or errors
4. Test on different Android versions (8.0+)
