CREATE TABLE IF NOT EXISTS spectral_aar_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES spectral_exercises(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES spectral_players(id) ON DELETE CASCADE,
  aar_document JSONB NOT NULL,
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('unsatisfactory','developing','satisfactory','commendable','distinguished')),
  accreditation_eligible BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exercise_id, player_id)
);
ALTER TABLE spectral_aar_documents ENABLE ROW LEVEL SECURITY;
