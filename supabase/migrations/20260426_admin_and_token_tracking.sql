-- Add admin flag to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Seed admin user
INSERT INTO user_settings (user_id, is_admin)
SELECT id, true FROM auth.users WHERE email = 'k4rthikr@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;

-- Global app config (key-value store)
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app config" ON app_config FOR SELECT USING (true);

INSERT INTO app_config (key, value) VALUES ('default_ai_provider', 'claude')
ON CONFLICT (key) DO NOTHING;

-- AI token usage tracking
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider text NOT NULL CHECK (provider IN ('claude', 'gemini')),
  feature text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  model text,
  fallback boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user ON ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created ON ai_token_usage(created_at);
