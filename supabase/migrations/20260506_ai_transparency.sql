-- AI Transparency & Auditability
-- Ensure we track the EXACT model used for each operation

-- 1. Update research_reports to include AI metadata
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS ai_provider text;
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS ai_model text;
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS error_message text;

-- 2. Update csp_scans to include AI model metadata
ALTER TABLE csp_scans ADD COLUMN IF NOT EXISTS claude_model text;
ALTER TABLE csp_scans ADD COLUMN IF NOT EXISTS error_message text;

-- 3. Update daily_recommendations
-- Add top_csp_picks to theme enum (if it was a check constraint)
ALTER TABLE daily_recommendations DROP CONSTRAINT IF EXISTS daily_recommendations_theme_check;
ALTER TABLE daily_recommendations ADD CONSTRAINT daily_recommendations_theme_check 
  CHECK (theme IN ('moonshot', 'local_optimization', 'csp_premium', 'top_csp_picks'));

ALTER TABLE daily_recommendations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE daily_recommendations ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE daily_recommendations ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
