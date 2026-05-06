-- Add call_candidates JSONB column to csp_scans table
ALTER TABLE csp_scans ADD COLUMN IF NOT EXISTS call_candidates jsonb DEFAULT '[]'::jsonb;
