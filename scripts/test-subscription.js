#!/usr/bin/env node

/**
 * Test script for Stripe subscription functionality
 * Run with: node scripts/test-subscription.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConfiguration() {
  console.log('🧪 Testing Stripe Subscription Configuration...\n');

  try {
    // Test 1: Verify Stripe connection
    console.log('1. Testing Stripe connection...');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.business_profile?.name || account.id}`);

    // Test 2: Check products and prices
    console.log('\n2. Checking subscription products...');
    const products = await stripe.products.list({ limit: 10 });
    const prices = await stripe.prices.list({ limit: 10 });

    console.log(`📦 Found ${products.data.length} products`);
    console.log(`💰 Found ${prices.data.length} prices`);

    // List products
    products.data.forEach(product => {
      console.log(`  - ${product.name}: ${product.description || 'No description'}`);
    });

    // Test 3: Verify environment variables
    console.log('\n3. Checking environment variables...');
    const requiredEnvVars = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRO_PRICE_ID',
      'STRIPE_ENTERPRISE_PRICE_ID'
    ];

    let missingVars = [];
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else {
        console.log(`✅ ${varName}: Set`);
      }
    });

    if (missingVars.length > 0) {
      console.log('\n❌ Missing environment variables:');
      missingVars.forEach(varName => {
        console.log(`  - ${varName}`);
      });
      console.log('\nPlease check your .env.local file.');
      return false;
    }

    // Test 4: Verify webhook endpoints
    console.log('\n4. Checking webhook endpoints...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log('⚠️  No webhook endpoints configured');
      console.log('   Please set up webhooks in your Stripe Dashboard');
    } else {
      console.log(`✅ Found ${webhooks.data.length} webhook endpoints:`);
      webhooks.data.forEach(webhook => {
        console.log(`  - ${webhook.url}`);
        console.log(`    Events: ${webhook.enabled_events.join(', ')}`);
      });
    }

    // Test 5: Create test customer (for testing)
    console.log('\n5. Testing customer creation...');
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: {
        test: 'true',
        created_by: 'test-script'
      }
    });
    console.log(`✅ Created test customer: ${testCustomer.id}`);

    // Cleanup test customer
    await stripe.customers.del(testCustomer.id);
    console.log('🗑️  Cleaned up test customer');

    console.log('\n🎉 All tests passed! Your Stripe configuration looks good.');
    console.log('\nNext steps:');
    console.log('1. Set up your subscription products and prices in Stripe Dashboard');
    console.log('2. Configure webhook endpoints');
    console.log('3. Test the subscription flow in your application');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'authentication_required') {
      console.log('\n💡 Tip: Make sure your STRIPE_SECRET_KEY is correct and starts with sk_test_');
    }
    
    return false;
  }
}

// Helper function to check if all required price IDs exist
async function validatePriceIds() {
  console.log('\n6. Validating price IDs...');
  
  const priceIds = [
    { name: 'Pro', id: process.env.STRIPE_PRO_PRICE_ID },
    { name: 'Enterprise', id: process.env.STRIPE_ENTERPRISE_PRICE_ID }
  ];

  for (const { name, id } of priceIds) {
    if (!id) {
      console.log(`❌ ${name} price ID not set`);
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(id);
      console.log(`✅ ${name} price (${id}): $${price.unit_amount / 100}/${price.recurring?.interval}`);
    } catch (error) {
      console.log(`❌ ${name} price ID (${id}) is invalid: ${error.message}`);
    }
  }
}

// Run the tests
if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  testStripeConfiguration()
    .then(success => {
      if (success) {
        return validatePriceIds();
      }
    })
    .then(() => {
      console.log('\n✨ Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}
