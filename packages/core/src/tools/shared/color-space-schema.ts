import { z } from 'zod';

export const colorSpaceSchema = z
  .enum(['SRGB', 'DISPLAY_P3'])
  .describe(
    "The space r/g/b are in. Omit for the document's own space, which is what reads report, so a " +
      'colour read from Figma writes back unchanged. A colour from code (CSS hex / rgb(), a design ' +
      'token) is sRGB: pass "SRGB" so a Display P3 file shows the same colour as the code instead ' +
      'of a more saturated one.',
  );
