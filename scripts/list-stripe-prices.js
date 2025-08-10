#!/usr/bin/env node

/**
 * Script to list all Stripe prices and products
 * Run with: node scripts/list-stripe-prices.js
 */

require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listPricesAndProducts() {
  console.log('🔍 Fetching all Stripe products and prices...\n');

  try {
    // Get all products
    const products = await stripe.products.list({ limit: 100 });
    
    // Get all prices
    const prices = await stripe.prices.list({ limit: 100 });

    console.log('📦 PRODUCTS:');
    console.log('='.repeat(50));
    
    for (const product of products.data) {
      console.log(`Product: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Description: ${product.description || 'No description'}`);
      console.log(`Active: ${product.active}`);
      
      // Find prices for this product
      const productPrices = prices.data.filter(price => price.product === product.id);
      
      if (productPrices.length > 0) {
        console.log(`Prices:`);
        productPrices.forEach(price => {
          const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'Free';
          const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
          console.log(`  - Price ID: ${price.id}`);
          console.log(`    Amount: ${amount}${interval}`);
          console.log(`    Active: ${price.active}`);
        });
      } else {
        console.log(`    No prices found`);
      }
      
      console.log('-'.repeat(30));
    }

    console.log('\n💰 ALL PRICES (Quick Reference):');
    console.log('='.repeat(50));
    
    for (const price of prices.data) {
      const product = products.data.find(p => p.id === price.product);
      const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'Free';
      const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
      
      console.log(`${price.id} → ${product?.name || 'Unknown Product'} - ${amount}${interval}`);
    }

    console.log('\n📋 Environment Variables for .env.local:');
    console.log('='.repeat(50));
    
    // Try to identify the plans based on amount
    const proPrices = prices.data.filter(p => p.unit_amount === 2000); // $20
    const enterprisePrices = prices.data.filter(p => p.unit_amount === 20000); // $200
    const freePrices = prices.data.filter(p => p.unit_amount === 0 || p.unit_amount === null);
    
    if (proPrices.length > 0) {
      console.log(`STRIPE_PRO_PRICE_ID=${proPrices[0].id}`);
    }
    
    if (enterprisePrices.length > 0) {
      console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrices[0].id}`);
    }
    
    if (freePrices.length > 0) {
      console.log(`STRIPE_FREE_PRICE_ID=${freePrices[0].id}`);
    }
    
    if (proPrices.length === 0 && enterprisePrices.length === 0) {
      console.log('\n⚠️  Could not auto-detect Pro ($20) and Enterprise ($200) prices.');
      console.log('   Please manually copy the correct Price IDs from the list above.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'authentication_required') {
      console.log('\n💡 Make sure your STRIPE_SECRET_KEY is set in .env.local');
    }
  }
}

// Run the script
listPricesAndProducts();
