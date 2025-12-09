import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

const inputLogo = join(publicDir, 'ar-carrier-logo.png');

async function generateFavicons() {
  console.log('🎨 Generating favicons from logo...\n');

  // Create app directory if it doesn't exist
  const appDir = join(publicDir);
  if (!existsSync(appDir)) {
    mkdirSync(appDir, { recursive: true });
  }

  // Generate favicon.ico (32x32)
  await sharp(inputLogo)
    .resize(32, 32)
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('✅ favicon.ico (32x32)');

  // Generate favicon-16x16.png
  await sharp(inputLogo)
    .resize(16, 16)
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('✅ favicon-16x16.png');

  // Generate favicon-32x32.png
  await sharp(inputLogo)
    .resize(32, 32)
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('✅ favicon-32x32.png');

  // Generate apple-touch-icon.png (180x180)
  await sharp(inputLogo)
    .resize(180, 180)
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png (180x180)');

  // Generate android-chrome-192x192.png
  await sharp(inputLogo)
    .resize(192, 192)
    .toFile(join(publicDir, 'android-chrome-192x192.png'));
  console.log('✅ android-chrome-192x192.png');

  // Generate android-chrome-512x512.png
  await sharp(inputLogo)
    .resize(512, 512)
    .toFile(join(publicDir, 'android-chrome-512x512.png'));
  console.log('✅ android-chrome-512x512.png');

  // Generate og-image.png (1200x630 for social sharing)
  await sharp(inputLogo)
    .resize(1200, 630, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile(join(publicDir, 'og-image.png'));
  console.log('✅ og-image.png (1200x630 - Open Graph)');

  console.log('\n🎉 All favicons generated successfully!');
}

generateFavicons().catch(console.error);

