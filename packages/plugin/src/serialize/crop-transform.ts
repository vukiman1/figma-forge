import type { PaintOwnerSize } from './paint-types.js';
import { round4 } from './rounding.js';

const MIN_INVERTIBLE_DETERMINANT = 1e-9;
const PERCENT = 100;

const hasArea = (ownerSize: PaintOwnerSize | null): ownerSize is PaintOwnerSize =>
  ownerSize !== null && ownerSize.width > 0 && ownerSize.height > 0;

export const cssCropTransform = (
  transform: Transform,
  ownerSize: PaintOwnerSize | null,
): string | undefined => {
  const [[a, b, c], [d, e, f]] = transform;
  const det = a * e - b * d;
  if (!Number.isFinite(det) || Math.abs(det) < MIN_INVERTIBLE_DETERMINANT) return undefined;
  const i11 = e / det;
  const i12 = -b / det;
  const i21 = -d / det;
  const i22 = a / det;
  const tx = round4(-(i11 * c + i12 * f) * PERCENT);
  const ty = round4(-(i21 * c + i22 * f) * PERCENT);
  const translate = `translate(${tx}%, ${ty}%)`;
  if (b === 0 && d === 0) return `${translate} scale(${round4(i11)}, ${round4(i22)})`;
  if (!hasArea(ownerSize)) return undefined;
  const ratio = ownerSize.width / ownerSize.height;
  const matrix = [i11, i21 / ratio, i12 * ratio, i22].map(round4).join(', ');
  return `${translate} matrix(${matrix}, 0, 0)`;
};
