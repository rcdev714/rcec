#!/bin/bash

# Script to manually sync subscription from Stripe
# This will update the billing cycle dates in the database

echo "=== Syncing Subscription from Stripe ==="
echo ""
echo "This will:"
echo "1. Fetch your subscription details from Stripe"
echo "2. Update billing cycle dates in the database"
echo "3. Align usage tracking with your Stripe billing period"
echo ""

# Make the API call (requires being logged in)
curl -X POST http://localhost:3000/api/subscriptions/sync \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -A 50 "< HTTP"

echo ""
echo "=== Done ===" 
echo ""
echo "Please refresh your dashboard to see updated billing cycle"

