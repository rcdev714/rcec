#!/usr/bin/env node

/**
 * Test script to verify environment setup for production deployment
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    const envFile = fs.readFileSync(filePath, 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key.trim()] = value.trim();
        }
      }
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

console.log('=== Environment Test Script ===\n');

// Try to load .env.local file
const envLocalPath = path.join(process.cwd(), '.env.local');
const envLoaded = loadEnvFile(envLocalPath);

if (envLoaded) {
  console.log('✓ Loaded .env.local file');
} else {
  console.log('⚠️  Could not load .env.local file from:', envLocalPath);
}

// Check Node version
console.log(`Node Version: ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Check required environment variables
const requiredVars = [
  'GOOGLE_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

console.log('Checking required environment variables:');
let hasErrors = false;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const maskedValue = value.substring(0, 4) + '****' + value.substring(value.length - 4);
    console.log(`✓ ${varName}: ${maskedValue}`);
  } else {
    console.log(`✗ ${varName}: NOT SET`);
    hasErrors = true;
  }
});

console.log('\n=== Test Results ===');
if (hasErrors) {
  console.log('❌ Some environment variables are missing!');
  console.log('Please set all required variables in your .env.local file or production environment.');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
}

// Test Google API key format
if (process.env.GOOGLE_API_KEY) {
  if (!process.env.GOOGLE_API_KEY.startsWith('AI')) {
    console.log('\n⚠️  Warning: GOOGLE_API_KEY format may be incorrect.');
    console.log('   Google API keys typically start with "AI"');
  }
}

console.log('\n=== Additional Checks ===');

// Check if running on Vercel
if (process.env.VERCEL) {
  console.log('✓ Running on Vercel');
  console.log(`  Region: ${process.env.VERCEL_REGION || 'unknown'}`);
  console.log(`  URL: ${process.env.VERCEL_URL || 'unknown'}`);
}

// Memory limits
console.log(`\nMemory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

console.log('\n=== Test Complete ===');
