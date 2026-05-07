-- Add user-specific AI preferences to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_ai_provider text CHECK (preferred_ai_provider IN ('claude', 'gemini')) DEFAULT 'gemini';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_ai_model text DEFAULT 'gemini-2.0-flash';

-- Update global default to gemini
UPDATE app_config SET value = 'gemini' WHERE key = 'default_ai_provider';
