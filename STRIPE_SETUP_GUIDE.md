# Stripe Subscription Integration Setup Guide

This guide will help you complete the setup of Stripe subscription functionality in your Next.js 15/Supabase application.

## 🚀 Implementation Status

✅ **Completed Components:**
- Stripe SDK integration
- Database schema for subscriptions
- API routes for checkout, webhooks, and management
- Middleware protection for subscription-based features
- Frontend components (pricing page, subscription status, usage limits)
- User profile integration

## 📋 Remaining Setup Steps

### 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in your Stripe Dashboard)
STRIPE_FREE_PRICE_ID=price_free_plan_id
STRIPE_PRO_PRICE_ID=price_pro_plan_id
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_plan_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Stripe Dashboard Setup

#### Create Products and Prices:

1. **Log into your Stripe Dashboard** → [https://dashboard.stripe.com](https://dashboard.stripe.com)

2. **Create Products:**
   - Go to **Products** → **Add product**
   - Create three products:
     - **Free Plan**: Name="Free", Description="Basic features"
     - **Pro Plan**: Name="Pro", Description="Advanced features", Price=$20/month
     - **Enterprise Plan**: Name="Enterprise", Description="Full access", Price=$200/month

3. **Get Price IDs:**
   - After creating each product, copy the Price ID (starts with `price_`)
   - Add these to your `.env.local` file

#### Configure Webhooks:

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `http://localhost:3000/api/subscriptions/webhook`
3. **Listen to events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the **Signing secret** and add it to `STRIPE_WEBHOOK_SECRET`

### 3. Database Migration

Run the Supabase migration to create the subscription tables:

```bash
# If using Supabase CLI
supabase db reset

# Or apply the migration manually in Supabase Dashboard
# Copy the contents of supabase/migrations/001_create_subscription_tables.sql
# and run it in the SQL Editor
```

### 4. Testing Setup

#### Test Mode Configuration:
- All Stripe keys provided should be test keys (starting with `pk_test_` and `sk_test_`)
- Use Stripe's test card numbers for payments
- No real money will be charged

#### Test Cards:
```
# Successful payment
4242 4242 4242 4242

# Failed payment
4000 0000 0000 0002

# Requires authentication
4000 0025 0000 3155
```

### 5. Local Development Testing

#### Start the Application:
```bash
npm run dev
```

#### Test Webhook Events Locally:

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Other platforms: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward Events to Local Server:**
   ```bash
   stripe listen --forward-to localhost:3000/api/subscriptions/webhook
   ```

4. **Test Events:**
   ```bash
   # Test checkout completion
   stripe trigger checkout.session.completed
   
   # Test subscription creation
   stripe trigger customer.subscription.created
   ```

## 🧪 Testing Workflow

### 1. User Registration Flow:
1. Sign up a new user
2. Verify default FREE subscription is created
3. Check dashboard shows correct subscription status

### 2. Subscription Upgrade Flow:
1. Go to `/pricing`
2. Select Pro or Enterprise plan
3. Complete checkout with test card `4242 4242 4242 4242`
4. Verify subscription status updates
5. Check access to protected features

### 3. Subscription Management:
1. Access billing portal from dashboard
2. Test subscription cancellation
3. Test subscription reactivation

### 4. Feature Access Control:
1. Test export functionality with different plans
2. Verify middleware redirects work correctly
3. Test usage limits display

## 🚨 Common Issues & Solutions

### Webhook Issues:
- **Problem**: Webhooks not received
- **Solution**: Ensure webhook URL is accessible and Stripe CLI is running

### Database Issues:
- **Problem**: Subscription not found
- **Solution**: Check if migration was applied and default subscription was created

### Environment Variables:
- **Problem**: Stripe keys not working
- **Solution**: Verify keys are test keys and correctly copied

### CORS Issues:
- **Problem**: API calls failing
- **Solution**: Check Next.js API route setup and middleware configuration

## 📊 Available Features by Plan

### Free Plan ($0/month):
- ✅ Basic company search (10/day)
- ✅ Basic support
- ❌ Data export
- ❌ Advanced filtering
- ❌ API access

### Pro Plan ($20/month):
- ✅ All Free features
- ✅ Unlimited company search
- ✅ Data export (50/month)
- ✅ Advanced filtering
- ✅ Priority support
- ❌ Full API access

### Enterprise Plan ($200/month):
- ✅ All Pro features
- ✅ Unlimited data export
- ✅ Full API access
- ✅ Custom integrations
- ✅ Dedicated support
- ✅ Advanced analytics

## 🔗 Important URLs

- **Pricing Page**: `/pricing`
- **Dashboard**: `/dashboard`
- **Subscription Status API**: `/api/subscriptions/status`
- **Checkout API**: `/api/subscriptions/checkout`
- **Webhook Endpoint**: `/api/subscriptions/webhook`
- **Portal API**: `/api/subscriptions/portal`

## 📚 Next Steps

1. **Production Deployment:**
   - Replace test keys with live keys
   - Update webhook URLs to production
   - Test in production environment

2. **Additional Features:**
   - Usage tracking implementation
   - Email notifications for subscription events
   - Advanced analytics for Enterprise users

3. **Monitoring:**
   - Set up Stripe webhook monitoring
   - Add subscription metrics to dashboard
   - Monitor failed payments and churn

## 🆘 Support

If you encounter issues:
1. Check the console for error messages
2. Verify environment variables are set correctly
3. Test webhooks with Stripe CLI
4. Check Supabase logs for database issues

Remember: Always test thoroughly in development before deploying to production!
