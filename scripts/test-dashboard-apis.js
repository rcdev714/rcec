/**
 * Test dashboard API endpoints
 * This requires being logged in and having a valid session
 */

require('dotenv').config({ path: '.env.local' });

async function testAPIs() {
  console.log('\n=== Testing Dashboard API Endpoints ===\n');

  // You'll need to get a valid session cookie from your browser
  console.log('⚠️  NOTE: This test requires authentication.');
  console.log('To test the APIs manually:');
  console.log('1. Open your browser to http://localhost:3000');
  console.log('2. Log in to the application');
  console.log('3. Open DevTools → Network tab');
  console.log('4. Navigate to /dashboard');
  console.log('5. Look for these API calls:');
  console.log('   - /api/usage/summary');
  console.log('   - /api/agent/cost-summary');
  console.log('   - /api/usage/timeseries');
  console.log('\n6. Check the Response for each API call');
  console.log('\n7. Check the Console tab for any [Analytics] log messages\n');

  // Test Supabase RPC function exists
  console.log('Checking Supabase RPC function...');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check if RPC function exists
  try {
    const { data, error } = await supabase.rpc('get_user_cost_summary', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      p_period_start: new Date().toISOString(),
      p_period_end: new Date().toISOString()
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.error('❌ RPC function get_user_cost_summary does not exist!');
        console.log('\n💡 You may need to create this function in Supabase.');
      } else {
        console.log('✅ RPC function get_user_cost_summary exists');
      }
    } else {
      console.log('✅ RPC function get_user_cost_summary exists and responds');
    }
  } catch (err) {
    console.error('❌ Error testing RPC function:', err.message);
  }

  console.log('\n=== Test Complete ===\n');
  console.log('Next steps:');
  console.log('1. Navigate to http://localhost:3000/dashboard in your browser');
  console.log('2. Open DevTools → Console');
  console.log('3. Look for [Analytics] log messages');
  console.log('4. Check if usage data is now displaying correctly\n');
}

testAPIs().catch(console.error);

