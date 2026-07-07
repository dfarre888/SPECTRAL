/**
 * SPECTRAL PCM — AAR document persistence (service-role write path)
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AARDocument } from '@/lib/pcm/aar-engine';

export interface AarDocumentRow {
  exercise_id: string;
  player_id: string;
  aar_document: AARDocument;
  overall_grade: string;
  accreditation_eligible: boolean;
}

export function buildAarDocumentRow(
  exerciseId: string,
  playerId: string,
  doc: AARDocument,
): AarDocumentRow {
  return {
    exercise_id: exerciseId,
    player_id: playerId,
    aar_document: doc,
    overall_grade: doc.overall_grade,
    accreditation_eligible: doc.accreditation_eligible,
  };
}

export async function persistAarDocument(
  supabase: SupabaseClient,
  exerciseId: string,
  playerId: string,
  doc: AARDocument,
): Promise<{ error: Error | null }> {
  const row = buildAarDocumentRow(exerciseId, playerId, doc);
  const { error } = await supabase
    .from('spectral_aar_documents')
    .upsert(row, { onConflict: 'exercise_id,player_id' });
  return { error: error ? new Error(error.message) : null };
}
