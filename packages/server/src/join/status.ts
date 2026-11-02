const HIGH_CONFIDENCE = 0.85;

export const CANDIDATE_FLOOR = 0.5;

export type MappingStatus = 'high' | 'medium' | 'low' | 'unmapped' | 'framework-builtin';

export const statusFor = (confidence: number, threshold: number): MappingStatus => {
  if (confidence < CANDIDATE_FLOOR) return 'unmapped';
  if (confidence >= Math.max(HIGH_CONFIDENCE, threshold)) return 'high';
  if (confidence >= threshold) return 'medium';
  return 'low';
};
