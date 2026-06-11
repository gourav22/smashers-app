# PWA Icons

## Generated Icons

This directory contains PWA icons generated from `icon.svg`.

### Sizes Available:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## Manual Generation Required

Since ImageMagick is not installed, please convert the SVG manually:

### Option 1: Online Tool
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload `icon.svg`
3. Download all sizes
4. Place them in this directory

### Option 2: Using ImageMagick (if available)
\`\`\`bash
cd public/icons
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
\`\`\`

### Option 3: Using Node.js sharp (recommended)
```bash
npm install sharp
node scripts/generate-icons-sharp.js
```

## For Now

Placeholder PNG files have been created. Replace them with properly rendered versions for production.
