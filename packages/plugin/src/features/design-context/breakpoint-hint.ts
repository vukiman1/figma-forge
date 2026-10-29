const DESKTOP_MIN_WIDTH = 1280;
const TABLET_MIN_WIDTH = 600;

const widthBucket = (width: number): string => {
  if (width >= DESKTOP_MIN_WIDTH) return 'desktop';
  return width >= TABLET_MIN_WIDTH ? 'tablet' : 'mobile';
};

const groundEachFrame = (acrossScreens: string): string =>
  `get_design_context on EACH frame by its own nodeId and take every size (font, line-height, ` +
  `padding, gap) from that frame's own data — never carry sizes across breakpoints${acrossScreens}, ` +
  `never pick one as canonical and scale the others by eye, and never read sizes off the screenshot ` +
  `raster. The output stays responsive: emit these as mobile-first breakpoint variants (e.g. ` +
  `px-4 lg:px-20), keep the container fluid (w-full / max-w), and never hardcode a frame's own ` +
  `width — no w-[375px] root and no fixed-width mobile menu (a full-bleed menu is fixed inset-0 w-full).`;

export const breakpointHint = (roots: readonly SceneNode[]): string | undefined => {
  const frames = roots.filter((root): root is FrameNode => root.type === 'FRAME');
  if (frames.length < 2) return undefined;
  const buckets = new Set(frames.map(frame => widthBucket(frame.width)));
  if (buckets.size < 2) return undefined;
  const widths = [...new Set(frames.map(frame => Math.round(frame.width)))]
    .toSorted((a, b) => b - a)
    .join(' / ');
  const hasSeveralScreens = frames.length > buckets.size;
  const lead =
    `Selection holds ${frames.length} top-level frames spanning widths ${widths}px — these are ` +
    `breakpoints, not one combined screen. `;
  if (!hasSeveralScreens) return `${lead}Run ${groundEachFrame('')}`;
  return (
    lead +
    `More than one screen is present: first pair each screen to its own breakpoint frames (by ` +
    `normalized name / matching content), then run ${groundEachFrame(' or screens')}`
  );
};
