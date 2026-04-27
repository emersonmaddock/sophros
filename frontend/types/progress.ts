/**
 * Progress feature types — mirrors the backend Pydantic schemas in
 * app/schemas/progress.py. Once `pnpm generate-client` is run these will
 * be in api/types.gen.ts and this file can be removed.
 */

export type WeightLogEntryRead = {
  date: string; // YYYY-MM-DD
  weight_kg: number;
  source: string;
};

export type ArchivedGoalRead = {
  id: string;
  start_date: string;
  target_date: string;
  start_weight_kg: number;
  target_weight_kg: number;
  end_date: string;
  final_weight_kg: number | null;
  weight_change_kg: number | null;
  archived_at: string;
};
