/**
 * Comprehensive diagnostic script for chat errors
 * Run with: node scripts/diagnose-chat-error.js
 */

require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  console.log('\n=== Chat System Diagnostics ===\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // 1. Check Environment Variables
  console.log('1. Checking Environment Variables...');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.passed.push(`✅ ${envVar} is set`);
    } else {
      results.failed.push(`❌ ${envVar} is missing`);
    }
  }

  // 2. Test Google API
  console.log('\n2. Testing Google API...');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Test');
    await result.response;
    results.passed.push('✅ Google API connection working');
  } catch (error) {
    results.failed.push(`❌ Google API error: ${error.message}`);
  }

  // 3. Test Supabase Connection
  console.log('\n3. Testing Supabase Connection...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { error } = await supabase.from('user_profiles').select('count').limit(1);
    if (error && !error.message.includes('JWT')) {
      results.warnings.push(`⚠️  Supabase query warning: ${error.message}`);
    } else {
      results.passed.push('✅ Supabase connection working');
    }
  } catch (error) {
    results.failed.push(`❌ Supabase error: ${error.message}`);
  }

  // 4. Check Node Version
  console.log('\n4. Checking Node.js Version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    results.passed.push(`✅ Node.js version ${nodeVersion} (>= 18)`);
  } else {
    results.warnings.push(`⚠️  Node.js version ${nodeVersion} (< 18, may cause issues)`);
  }

  // 5. Check Required Packages
  console.log('\n5. Checking Required Packages...');
  const requiredPackages = [
    '@langchain/core',
    '@langchain/google-genai',
    '@google/generative-ai',
    '@supabase/supabase-js',
    '@langchain/langgraph'
  ];

  for (const pkg of requiredPackages) {
    try {
      require(pkg);
      results.passed.push(`✅ ${pkg} installed`);
    } catch (error) {
      results.failed.push(`❌ ${pkg} not found`);
    }
  }

  // Print Results
  console.log('\n=== Results ===\n');
  
  if (results.passed.length > 0) {
    console.log('✅ Passed Checks:');
    results.passed.forEach(r => console.log(`   ${r}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(r => console.log(`   ${r}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    results.failed.forEach(r => console.log(`   ${r}`));
    console.log('\n💡 Please fix the failed checks before proceeding.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All critical checks passed! Your environment is configured correctly.\n');
    console.log('If you\'re still experiencing errors, please:');
    console.log('1. Check the browser console for specific error messages');
    console.log('2. Check the server console (terminal running npm run dev)');
    console.log('3. Try restarting the development server\n');
  }
}

diagnose().catch(error => {
  console.error('\n❌ Diagnostic script failed:');
  console.error(error);
  process.exit(1);
});

