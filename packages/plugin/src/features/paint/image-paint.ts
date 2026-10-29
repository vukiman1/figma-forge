export type ScaleMode = ImagePaint['scaleMode'];

const keepScaleMode = (
  replaced: ImagePaint,
  imageHash: string,
  scaleMode: ScaleMode,
): ImagePaint => {
  const { imageTransform: _transform, scalingFactor: _scale, ...kept } = replaced;
  return { ...kept, imageHash, scaleMode };
};

const inheritAppearance = (replaced: Paint) => ({
  ...(replaced.visible === undefined ? {} : { visible: replaced.visible }),
  ...(replaced.opacity === undefined ? {} : { opacity: replaced.opacity }),
  ...(replaced.blendMode === undefined ? {} : { blendMode: replaced.blendMode }),
});

export const imagePaintFor = (
  replaced: Paint | undefined,
  imageHash: string,
  scaleMode: ScaleMode | undefined,
): ImagePaint => {
  if (replaced?.type === 'IMAGE') {
    if (scaleMode === undefined || scaleMode === replaced.scaleMode)
      return { ...replaced, imageHash };
    return keepScaleMode(replaced, imageHash, scaleMode);
  }
  const paint: ImagePaint = { type: 'IMAGE', scaleMode: scaleMode ?? 'FILL', imageHash };
  return replaced === undefined ? paint : { ...paint, ...inheritAppearance(replaced) };
};
