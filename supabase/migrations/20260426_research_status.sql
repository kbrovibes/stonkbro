ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed'));
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS mode text DEFAULT 'deep';
ALTER TABLE research_reports ADD COLUMN IF NOT EXISTS opened boolean DEFAULT false;
