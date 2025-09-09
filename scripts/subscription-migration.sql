-- SUBSCRIPTION SYSTEM MIGRATION SCRIPT
-- This script standardizes the subscription system to prevent data corruption and billing errors
-- Run this script in a transaction to ensure atomicity

BEGIN;

-- STEP 1: BACKUP CURRENT STATE FOR SAFETY
CREATE TEMP TABLE subscription_plans_backup AS SELECT * FROM subscription_plans;
CREATE TEMP TABLE user_subscriptions_backup AS SELECT * FROM user_subscriptions;

-- Log the migration start
INSERT INTO system_events (event_type, description, event_data, severity)
VALUES ('system_maintenance', 'Starting subscription system migration', '{"migration": "standardize_plan_ids"}', 'info');

-- STEP 2: STANDARDIZE PLAN IDs TO UPPERCASE
-- Update subscription_plans table to use uppercase IDs
UPDATE subscription_plans
SET id = UPPER(id)
WHERE id IN ('free', 'pro', 'enterprise');

-- Update user_subscriptions table to use uppercase plan values
UPDATE user_subscriptions
SET plan = UPPER(plan)
WHERE plan IN ('free', 'pro', 'enterprise');

-- STEP 3: ADD REFERENTIAL INTEGRITY
-- Add foreign key constraint (with NO ACTION to prevent accidental deletions)
ALTER TABLE user_subscriptions
ADD CONSTRAINT fk_user_subscriptions_plan
FOREIGN KEY (plan) REFERENCES subscription_plans(id) ON DELETE RESTRICT;

-- STEP 4: ADD DATA VALIDATION
-- Add check constraint to ensure only valid plan values
ALTER TABLE user_subscriptions
ADD CONSTRAINT chk_user_subscriptions_plan_valid
CHECK (plan IN ('FREE', 'PRO', 'ENTERPRISE'));

-- STEP 5: VERIFY THE MIGRATION
-- Check that all user subscriptions have valid plans
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM user_subscriptions
    WHERE plan NOT IN ('FREE', 'PRO', 'ENTERPRISE');

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Found % invalid plan values in user_subscriptions', invalid_count;
    END IF;
END $$;

-- STEP 6: LOG SUCCESSFUL MIGRATION
INSERT INTO system_events (event_type, description, event_data, severity)
VALUES ('system_maintenance', 'Subscription system migration completed successfully', '{"migration": "standardize_plan_ids", "status": "success"}', 'info');

COMMIT;

-- VERIFICATION QUERIES (run after commit)
-- SELECT 'subscription_plans count:' as info, COUNT(*) as count FROM subscription_plans
-- UNION ALL
-- SELECT 'user_subscriptions count:' as info, COUNT(*) as count FROM user_subscriptions
-- UNION ALL
-- SELECT 'valid plans count:' as info, COUNT(*) as count FROM user_subscriptions WHERE plan IN ('FREE', 'PRO', 'ENTERPRISE')
-- UNION ALL
-- SELECT 'invalid plans count:' as info, COUNT(*) as count FROM user_subscriptions WHERE plan NOT IN ('FREE', 'PRO', 'ENTERPRISE');
