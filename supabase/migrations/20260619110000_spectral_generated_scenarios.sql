ALTER TABLE spectral_scenarios ADD COLUMN IF NOT EXISTS generation_config JSONB;
ALTER TABLE spectral_scenarios ADD COLUMN IF NOT EXISTS generated_for_player_id UUID REFERENCES spectral_players(id);
ALTER TABLE spectral_scenarios ADD COLUMN IF NOT EXISTS generation_method TEXT DEFAULT 'manual'
  CHECK (generation_method IN ('ai_generated', 'ai_assisted', 'manual'));
CREATE INDEX IF NOT EXISTS idx_scenarios_player ON spectral_scenarios(generated_for_player_id);
