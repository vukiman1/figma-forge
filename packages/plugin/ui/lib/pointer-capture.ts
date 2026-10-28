const NO_CAPTURE = (): void => {};

const releaseIfStillHeld = (element: Element, pointerId: number): void => {
  try {
    element.releasePointerCapture(pointerId);
  } catch {}
};

export const capturePointer = (event: PointerEvent): (() => void) => {
  const host = event.currentTarget;
  if (!(host instanceof Element)) return NO_CAPTURE;
  try {
    host.setPointerCapture(event.pointerId);
  } catch {
    return NO_CAPTURE;
  }
  return () => releaseIfStillHeld(host, event.pointerId);
};
