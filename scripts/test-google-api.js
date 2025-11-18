/**
 * Test script to validate Google API key configuration
 * Run with: node scripts/test-google-api.js
 */

require('dotenv').config({ path: '.env.local' });

async function testGoogleAPI() {
  console.log('\n=== Testing Google API Key ===\n');

  // Check if API key is set
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY is not set in environment variables');
    process.exit(1);
  }

  console.log('✅ GOOGLE_API_KEY is set');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Starts with: ${apiKey.substring(0, 10)}...`);

  // Check format
  if (!apiKey.startsWith('AI')) {
    console.warn('\n⚠️  Warning: Google API keys typically start with "AI"');
    console.warn('   Your key may be invalid or from a different service');
  } else {
    console.log('✅ API key format looks correct (starts with "AI")');
  }

  // Try to make a simple API call
  console.log('\n=== Testing API Connection ===\n');
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('Attempting to list available models...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('Sending test prompt...');
    const result = await model.generateContent('Say "Hello, API is working!"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API call successful!');
    console.log(`   Response: "${text}"`);
    
    console.log('\n✅ All tests passed! Your Google API key is configured correctly.\n');
    
  } catch (error) {
    console.error('\n❌ API call failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('API key not valid')) {
      console.error('\n💡 Your API key appears to be invalid.');
      console.error('   Please check:');
      console.error('   1. The key is copied correctly from Google AI Studio');
      console.error('   2. The key has not been restricted or revoked');
      console.error('   3. You\'re using a key from https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('quota')) {
      console.error('\n💡 Your API key has exceeded its quota.');
      console.error('   Please check your usage limits in Google Cloud Console.');
    } else if (error.message.includes('403')) {
      console.error('\n💡 Your API key does not have permission to use this API.');
      console.error('   Please enable the Generative Language API in Google Cloud Console.');
    }
    
    console.error(`\n   Full error details:`);
    console.error(error);
    process.exit(1);
  }
}

testGoogleAPI().catch(console.error);

