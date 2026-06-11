const fs = require('fs');
const path = require('path');

// SVG icon with sports theme
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="110" fill="url(#grad)"/>

  <!-- Badminton racket -->
  <g transform="translate(130, 120)">
    <!-- Racket head -->
    <ellipse cx="60" cy="60" rx="45" ry="55" fill="none" stroke="white" stroke-width="8"/>
    <line x1="45" y1="30" x2="75" y2="30" stroke="white" stroke-width="2"/>
    <line x1="45" y1="50" x2="75" y2="50" stroke="white" stroke-width="2"/>
    <line x1="45" y1="70" x2="75" y2="70" stroke="white" stroke-width="2"/>
    <line x1="45" y1="90" x2="75" y2="90" stroke="white" stroke-width="2"/>
    <line x1="35" y1="45" x2="35" y2="75" stroke="white" stroke-width="2"/>
    <line x1="60" y1="25" x2="60" y2="95" stroke="white" stroke-width="2"/>
    <line x1="85" y1="45" x2="85" y2="75" stroke="white" stroke-width="2"/>

    <!-- Handle -->
    <rect x="52" y="110" width="16" height="70" rx="8" fill="white"/>
  </g>

  <!-- Cricket bat -->
  <g transform="translate(280, 140) rotate(-15)">
    <!-- Bat blade -->
    <rect x="0" y="0" width="60" height="120" rx="30" fill="white"/>
    <line x1="15" y1="20" x2="15" y2="100" stroke="#3B82F6" stroke-width="2"/>
    <line x1="30" y1="20" x2="30" y2="100" stroke="#3B82F6" stroke-width="2"/>
    <line x1="45" y1="20" x2="45" y2="100" stroke="#3B82F6" stroke-width="2"/>

    <!-- Handle -->
    <rect x="18" y="115" width="24" height="80" rx="12" fill="#E5E7EB"/>
  </g>

  <!-- Badge/Shield -->
  <path d="M 256 340 L 210 365 L 210 420 Q 210 450 256 470 Q 302 450 302 420 L 302 365 Z"
        fill="white" opacity="0.9"/>

  <!-- Trophy icon in badge -->
  <text x="256" y="425" font-size="40" text-anchor="middle" fill="#3B82F6">🏆</text>

  <!-- App name -->
  <text x="256" y="50" font-family="Arial, sans-serif" font-size="36" font-weight="bold"
        fill="white" text-anchor="middle">SMASHERS</text>
</svg>`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Save base SVG
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSVG);
console.log('✓ Created base SVG icon');

// Create README for icon generation
const readme = `# PWA Icons

## Generated Icons

This directory contains PWA icons generated from \`icon.svg\`.

### Sizes Available:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## Manual Generation Required

Since ImageMagick is not installed, please convert the SVG manually:

### Option 1: Online Tool
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload \`icon.svg\`
3. Download all sizes
4. Place them in this directory

### Option 2: Using ImageMagick (if available)
\\\`\\\`\\\`bash
cd public/icons
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize \${size}x\${size} icon-\${size}x\${size}.png
done
\\\`\\\`\\\`

### Option 3: Using Node.js sharp (recommended)
\`\`\`bash
npm install sharp
node scripts/generate-icons-sharp.js
\`\`\`

## For Now

Placeholder PNG files have been created. Replace them with properly rendered versions for production.
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), readme);
console.log('✓ Created README with instructions');

// Create simple placeholder PNGs using data URLs (very basic fallback)
console.log('\n⚠️  Creating placeholder icons...');
console.log('For production, please generate proper PNG files using one of the methods in icons/README.md\n');

sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  // Copy SVG as placeholder - browsers can handle SVG
  fs.writeFileSync(path.join(iconsDir, filename), iconSVG);
  console.log(`  Created placeholder: ${filename}`);
});

console.log('\n✓ Icon generation complete!');
console.log('✓ Next step: Convert SVG to PNG using methods in public/icons/README.md');
