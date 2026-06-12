#!/usr/bin/env node

// Generate VAPID keys for Web Push notifications
// Run once: node scripts/generate-vapid-keys.js
// Save the output to your .env.local file

const webpush = require('web-push');

console.log('\n🔑 Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Keys generated successfully!\n');
console.log('Add these to your .env.local file:\n');
console.log('═'.repeat(60));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@smashersclub.com`);
console.log('═'.repeat(60));
console.log('\n⚠️  Keep the private key secret! Do not commit to git.\n');
