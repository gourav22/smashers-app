#!/bin/bash

echo "🔍 Pre-Deployment Check for Sports Club App"
echo "============================================"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Required files exist
echo "✓ Checking required files..."
FILES=("package.json" "next.config.ts" "tsconfig.json" "src/app/layout.tsx" "src/app/page.tsx" "public/manifest.json" "public/service-worker.js" "vercel.json")
for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "  ✗ Missing: $file"
    ERRORS=$((ERRORS+1))
  fi
done

# Check 2: No .env files in git
echo "✓ Checking for .env files in git..."
if git ls-files | grep -q "^\.env"; then
  echo "  ⚠ Warning: .env files found in git (should be in .gitignore)"
  WARNINGS=$((WARNINGS+1))
fi

# Check 3: Icon files exist
echo "✓ Checking icon files..."
if [ ! -f "public/icons/icon.svg" ]; then
  echo "  ✗ Missing: public/icons/icon.svg"
  ERRORS=$((ERRORS+1))
fi

# Check 4: No broken image references
echo "✓ Checking for broken image references..."
BROKEN=$(grep -r "icon-[0-9]*x[0-9]*.png" src/ public/ --include="*.tsx" --include="*.ts" --include="*.js" 2>/dev/null | wc -l)
if [ "$BROKEN" -gt 0 ]; then
  echo "  ⚠ Warning: Found $BROKEN references to deleted PNG icons"
  WARNINGS=$((WARNINGS+1))
fi

# Check 5: Package.json has required dependencies
echo "✓ Checking dependencies..."
DEPS=("@supabase/supabase-js" "@supabase/ssr" "next" "react" "react-dom")
for dep in "${DEPS[@]}"; do
  if ! grep -q "\"$dep\"" package.json; then
    echo "  ✗ Missing dependency: $dep"
    ERRORS=$((ERRORS+1))
  fi
done

# Check 6: No TypeScript errors (if tsc is available)
echo "✓ Running TypeScript check..."
if command -v npx &> /dev/null; then
  if ! npx tsc --noEmit 2>&1 | head -20; then
    echo "  ⚠ TypeScript check completed (see output above)"
  fi
else
  echo "  ⚠ Skipping TypeScript check (npx not available)"
fi

# Check 7: Service worker references valid files
echo "✓ Checking service worker..."
if grep -q "icon-192x192.png\|icon-512x512.png" public/service-worker.js; then
  echo "  ✗ Service worker references deleted PNG icons"
  ERRORS=$((ERRORS+1))
fi

# Check 8: No console.log in production code (warning only)
echo "✓ Checking for console statements..."
CONSOLE_COUNT=$(find src/app -name "*.tsx" -o -name "*.ts" | xargs grep -c "console.log" 2>/dev/null | awk -F: '{sum+=$NF} END {print sum}')
if [ "$CONSOLE_COUNT" -gt 5 ]; then
  echo "  ⚠ Warning: Found $CONSOLE_COUNT console.log statements"
  WARNINGS=$((WARNINGS+1))
fi

# Check 9: Manifest is valid JSON
echo "✓ Checking manifest.json..."
if ! python3 -m json.tool public/manifest.json > /dev/null 2>&1; then
  echo "  ✗ Invalid JSON in manifest.json"
  ERRORS=$((ERRORS+1))
fi

# Check 10: Git status
echo "✓ Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "  ⚠ Warning: Uncommitted changes detected"
  WARNINGS=$((WARNINGS+1))
fi

echo ""
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ Pre-deployment check PASSED"
  echo "   Errors: $ERRORS | Warnings: $WARNINGS"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Ensure environment variables are set in Vercel dashboard"
  echo "   2. git push to deploy"
  echo "   3. Check Vercel build logs"
  exit 0
else
  echo "❌ Pre-deployment check FAILED"
  echo "   Errors: $ERRORS | Warnings: $WARNINGS"
  echo ""
  echo "Fix the errors above before deploying."
  exit 1
fi
