#!/usr/bin/env node

/**
 * Comprehensive test script for the subscription system
 * Tests database connectivity, plan management, validation, and subscription operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SubscriptionSystemTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Running test: ${testName}`);
      const result = await testFunction();
      this.testResults.push({ testName, result: 'PASS', details: result });
      this.log(`${testName}: PASS`, 'success');
      return result;
    } catch (error) {
      this.errors.push({ testName, error: error.message });
      this.testResults.push({ testName, result: 'FAIL', error: error.message });
      this.log(`${testName}: FAIL - ${error.message}`, 'error');
      return null;
    }
  }

  async testDatabaseConnection() {
    const { data, error } = await supabase.from('subscription_plans').select('count').limit(1);
    if (error) throw new Error(`Database connection failed: ${error.message}`);
    return 'Database connection successful';
  }

  async testPlanDataIntegrity() {
    // Check that all plans have uppercase IDs
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('id, name, price_id');

    if (error) throw error;
    if (!plans || plans.length === 0) throw new Error('No plans found in database');

    // Verify all plan IDs are uppercase
    const invalidPlans = plans.filter(plan => plan.id !== plan.id.toUpperCase());
    if (invalidPlans.length > 0) {
      throw new Error(`Found plans with non-uppercase IDs: ${invalidPlans.map(p => p.id).join(', ')}`);
    }

    // Verify all plans have price_ids
    const plansWithoutPriceId = plans.filter(plan => !plan.price_id);
    if (plansWithoutPriceId.length > 0) {
      throw new Error(`Found plans without price_id: ${plansWithoutPriceId.map(p => p.id).join(', ')}`);
    }

    return `Found ${plans.length} valid plans: ${plans.map(p => p.id).join(', ')}`;
  }

  async testUserSubscriptionsIntegrity() {
    // Check that all user subscriptions have valid plans
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan, status');

    if (error) throw error;

    // Get valid plans
    const { data: validPlans } = await supabase
      .from('subscription_plans')
      .select('id');

    const validPlanIds = validPlans.map(p => p.id);

    // Check for invalid plans
    const invalidSubscriptions = subscriptions.filter(sub =>
      !validPlanIds.includes(sub.plan)
    );

    if (invalidSubscriptions.length > 0) {
      throw new Error(`Found ${invalidSubscriptions.length} subscriptions with invalid plans`);
    }

    return `Found ${subscriptions.length} valid user subscriptions`;
  }

  async testForeignKeyConstraints() {
    // Test that foreign key constraints work
    try {
      // This should fail due to foreign key constraint
      await supabase
        .from('user_subscriptions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          plan: 'INVALID_PLAN'
        });
      throw new Error('Foreign key constraint not working - invalid plan was inserted');
    } catch (error) {
      if (error.code === '23503' || error.message.includes('violates foreign key constraint')) {
        return 'Foreign key constraints working correctly';
      }
      throw error;
    }
  }

  async testCheckConstraints() {
    // Test that check constraints work
    try {
      // This should fail due to check constraint
      await supabase
        .from('user_subscriptions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          plan: 'FREE',
          status: 'invalid_status'
        });
      throw new Error('Check constraint not working - invalid status was inserted');
    } catch (error) {
      if (error.code === '23514' || error.message.includes('violates check constraint')) {
        return 'Check constraints working correctly';
      }
      throw error;
    }
  }

  async testPlanRetrieval() {
    // Test that we can retrieve plans correctly
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price');

    if (error) throw error;
    if (!plans || plans.length < 3) throw new Error('Expected at least 3 plans');

    // Verify FREE plan has price 0
    const freePlan = plans.find(p => p.id === 'FREE');
    if (!freePlan || freePlan.price !== 0) {
      throw new Error('FREE plan not configured correctly');
    }

    return `Successfully retrieved ${plans.length} plans with correct pricing`;
  }

  async testUserSubscriptionRetrieval() {
    // Test retrieving a user's subscription
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return 'No user subscriptions found (expected for testing)';
    }

    const subscription = subscriptions[0];

    // Verify required fields
    const requiredFields = ['user_id', 'plan', 'status', 'created_at'];
    for (const field of requiredFields) {
      if (!subscription[field]) {
        throw new Error(`Subscription missing required field: ${field}`);
      }
    }

    return `Successfully retrieved user subscription for plan: ${subscription.plan}`;
  }

  async testUsageLimits() {
    // Test that usage limits are working
    const { data: usage, error } = await supabase
      .from('user_usage')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (!usage || usage.length === 0) {
      return 'No usage records found (expected for testing)';
    }

    const usageRecord = usage[0];

    // Verify usage fields exist and are numbers
    const usageFields = ['searches', 'exports', 'prompt_input_tokens'];
    for (const field of usageFields) {
      if (typeof usageRecord[field] !== 'number') {
        throw new Error(`Usage field ${field} is not a number`);
      }
    }

    return 'Usage tracking system working correctly';
  }

  async runAllTests() {
    this.log('🚀 Starting Subscription System Tests');

    const tests = [
      { name: 'Database Connection', fn: () => this.testDatabaseConnection() },
      { name: 'Plan Data Integrity', fn: () => this.testPlanDataIntegrity() },
      { name: 'User Subscriptions Integrity', fn: () => this.testUserSubscriptionsIntegrity() },
      { name: 'Foreign Key Constraints', fn: () => this.testForeignKeyConstraints() },
      { name: 'Check Constraints', fn: () => this.testCheckConstraints() },
      { name: 'Plan Retrieval', fn: () => this.testPlanRetrieval() },
      { name: 'User Subscription Retrieval', fn: () => this.testUserSubscriptionRetrieval() },
      { name: 'Usage Limits', fn: () => this.testUsageLimits() },
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }

    this.printSummary();
  }

  printSummary() {
    const passed = this.testResults.filter(t => t.result === 'PASS').length;
    const failed = this.testResults.filter(t => t.result === 'FAIL').length;
    const total = this.testResults.length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.errors.forEach(error => {
        console.log(`  - ${error.testName}: ${error.error}`);
      });
    }

    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Subscription system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
async function main() {
  const tester = new SubscriptionSystemTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = SubscriptionSystemTester;
