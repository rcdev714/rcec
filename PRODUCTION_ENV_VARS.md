# 🚀 Production Environment Variables

## ✅ Copy these to your production deployment (Railway/Vercel/Netlify)

### **CRITICAL - Required for app to work:**

```bash
# ═══════════════════════════════════════════════════════
# SUPABASE (Get from Supabase Dashboard → Settings → API)
# ═══════════════════════════════════════════════════════

NEXT_PUBLIC_SUPABASE_URL=https://nyhheibhlbvesqjvjupz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aGhlaWJobGJ2ZXNxanZqdXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODE4MTIsImV4cCI6MjA2NzE1NzgxMn0.BLQUl_UYQlnd73ntgDR4Cxo1SDj_otAKcAdlEFul3j4

# ⚠️ CRITICAL: Get this from Supabase → Settings → API → service_role key
# Without this, webhooks will fail!
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE


# ═══════════════════════════════════════════════════════
# STRIPE LIVE KEYS (NOT test keys!)
# Get from Stripe Dashboard → LIVE MODE → Developers → API keys
# ═══════════════════════════════════════════════════════

# Must start with sk_live_ (NOT sk_test_!)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE

# Must start with pk_live_ (NOT pk_test_!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE

# Get from Stripe → LIVE MODE → Developers → Webhooks → Your endpoint → Signing secret
# Must start with whsec_ and be from PRODUCTION webhook endpoint
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET_HERE

# Get from Stripe → LIVE MODE → Products → Pricing tables
# Starts with prctbl_
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_YOUR_LIVE_PRICING_TABLE_ID_HERE


# ═══════════════════════════════════════════════════════
# APP CONFIGURATION
# ═══════════════════════════════════════════════════════

# Your production domain (e.g., https://yourdomain.com)
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Comma-separated list of admin emails
ADMIN_EMAILS=information.arcane@gmail.com,admin2@example.com


# ═══════════════════════════════════════════════════════
# OPTIONAL (but recommended)
# ═══════════════════════════════════════════════════════

# Gemini API key (if using AI chat features)
GEMINI_API_KEY=your_gemini_api_key_here

# Node environment (usually set automatically by platform)
NODE_ENV=production
```

---

## 🔑 How to Get Each Key

### **1. SUPABASE_SERVICE_ROLE_KEY** (CRITICAL!)

1. Go to: https://supabase.com/dashboard/project/nyhheibhlbvesqjvjupz/settings/api
2. Scroll to **Project API keys**
3. Find row labeled **`service_role`** with 🔒 icon
4. Click **Reveal** or **Copy**
5. Paste as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **This is critical** - without it, webhooks can't update subscriptions!

---

### **2. STRIPE_SECRET_KEY** (Live Mode)

1. Go to: https://dashboard.stripe.com/apikeys
2. **IMPORTANT:** Make sure you're in **LIVE mode** (toggle in top-left, should NOT say "Test mode")
3. Find **Secret key** (starts with `sk_live_...`)
4. Click **Reveal** or use existing key
5. Copy and paste

⚠️ **Must be sk_live_** not sk_test_!

---

### **3. STRIPE_WEBHOOK_SECRET** (Production Endpoint)

1. Go to: https://dashboard.stripe.com/webhooks
2. **Make sure you're in LIVE mode** (not test mode!)
3. Click **+ Add endpoint**
4. URL: `https://your-production-domain.com/api/subscriptions/webhook`
5. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.created`
   - ✅ `invoice.finalized`
   - ✅ `customer.created`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_...`)
8. Paste as `STRIPE_WEBHOOK_SECRET`

---

### **4. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** (Live Mode)

1. Same place as secret key: https://dashboard.stripe.com/apikeys
2. **LIVE mode** (not test!)
3. Find **Publishable key** (starts with `pk_live_...`)
4. Copy and paste

---

### **5. NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID**

1. Go to: https://dashboard.stripe.com/test/pricing-tables
2. **Switch to LIVE mode!**
3. Find your pricing table
4. Copy the **Pricing table ID** (starts with `prctbl_...`)

OR create a new one:
- Click **Create pricing table**
- Add your PRO and ENTERPRISE products
- Configure display settings
- Copy the generated ID

---

## ⚠️ **CRITICAL CHECKLIST BEFORE DEPLOYING:**

### **Double-Check These:**

- [ ] ✅ `SUPABASE_SERVICE_ROLE_KEY` is set (start with `eyJhbGci...`)
- [ ] ✅ `STRIPE_SECRET_KEY` starts with `sk_live_` (NOT `sk_test_`)
- [ ] ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_` (NOT `pk_test_`)
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` is from PRODUCTION webhook endpoint
- [ ] ✅ Production webhook endpoint is configured in Stripe dashboard (LIVE mode)
- [ ] ✅ Pricing table ID is from LIVE mode (NOT test mode)
- [ ] ✅ All database migrations are deployed (5 RPC functions)

---

## 🚨 **COMMON MISTAKES TO AVOID:**

### **Mistake #1: Using Test Keys in Production**
❌ `sk_test_...` in production → Payments won't work with real cards!
✅ `sk_live_...` in production

### **Mistake #2: Forgetting SERVICE_ROLE_KEY**
❌ Not set → Webhooks fail silently, subscriptions never update
✅ Set in production → Webhooks work perfectly

### **Mistake #3: Wrong Webhook Secret**
❌ Using test webhook secret → Signature verification fails
✅ Create NEW production webhook endpoint, use its secret

### **Mistake #4: Not Configuring Production Webhook**
❌ No webhook endpoint in Stripe (LIVE mode) → Events never sent
✅ Add endpoint in Stripe dashboard (LIVE mode)

---

## 📋 **Where to Set These (By Platform)**

### **Railway:**
1. Go to project dashboard
2. Click **Variables** tab
3. Click **+ New Variable**
4. Add each variable name and value
5. Deploy (automatic after saving)

### **Vercel:**
1. Go to project settings
2. Click **Environment Variables**
3. Add each variable
4. Select **Production** environment
5. Click **Save**
6. Redeploy

### **Netlify:**
1. Site settings → Build & deploy → Environment
2. Click **Edit variables**
3. Add each variable
4. Save
5. Trigger new deploy

---

## ✅ **Quick Copy-Paste Template:**

```bash
# ====== SUPABASE ======
NEXT_PUBLIC_SUPABASE_URL=https://nyhheibhlbvesqjvjupz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aGhlaWJobGJ2ZXNxanZqdXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODE4MTIsImV4cCI6MjA2NzE1NzgxMn0.BLQUl_UYQlnd73ntgDR4Cxo1SDj_otAKcAdlEFul3j4
SUPABASE_SERVICE_ROLE_KEY=<GET_FROM_SUPABASE_DASHBOARD>

# ====== STRIPE LIVE ======
STRIPE_SECRET_KEY=sk_live_<GET_FROM_STRIPE_LIVE_MODE>
STRIPE_WEBHOOK_SECRET=whsec_<CREATE_PRODUCTION_WEBHOOK_FIRST>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<GET_FROM_STRIPE_LIVE_MODE>
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_<GET_FROM_STRIPE_LIVE_MODE>

# ====== APP CONFIG ======
NEXT_PUBLIC_APP_URL=https://your-domain.com
ADMIN_EMAILS=information.arcane@gmail.com
NODE_ENV=production
```

---

## 🎯 **Deployment Steps:**

1. **Get all the keys** (follow guides above)
2. **Add to your deployment platform** (Railway/Vercel/Netlify)
3. **Deploy your code:**
   ```bash
   git add .
   git commit -m "Production-ready subscription system"
   git push origin main
   ```
4. **Configure production webhook** in Stripe (LIVE mode)
5. **Test one purchase** and verify

---

**Need the service role key? Go to:** https://supabase.com/dashboard/project/nyhheibhlbvesqjvjupz/settings/api

**Ready to deploy! 🚀**

