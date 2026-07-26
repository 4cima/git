# Missing Assets for Production

To ensure your site looks perfect on social media and mobile devices, please add the following files to the `public` directory:

## 1. Open Graph Image (Social Sharing)
- **File**: `public/og-image.jpg`
- **Size**: 1200x630 pixels
- **Purpose**: This image appears when someone shares your homepage on Facebook, Twitter, or WhatsApp.
- **Recommendation**: A branded banner with your logo and a montage of popular movies.

## 2. PWA Icons (Mobile App Install)
- **Files**:
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-512x512.png`
- **Purpose**: These icons are used when a user installs your app on their phone.
- **Note**: The current setup uses `logo.svg` as a fallback, which works on many modern devices, but PNGs are recommended for maximum compatibility (especially iOS).

## 3. Favicon
- **File**: `public/favicon.ico` (already exists? check!)
- **Purpose**: Browser tab icon.
