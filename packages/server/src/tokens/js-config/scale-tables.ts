export interface Scale {
  readonly key: string;
  readonly prefix: string;
  readonly category: string;
  readonly leafKey?: string;
  readonly joinArray?: boolean;
}

const V3_SHARED_SCALES: readonly Scale[] = [
  { key: 'colors', prefix: 'color-', category: 'color' },
  { key: 'spacing', prefix: 'spacing-', category: 'spacing' },
  { key: 'fontSize', prefix: 'text-', category: 'font-size' },
  { key: 'fontFamily', prefix: 'font-', category: 'font-family', joinArray: true },
  { key: 'fontWeight', prefix: 'font-weight-', category: 'font-weight' },
  { key: 'letterSpacing', prefix: 'tracking-', category: 'letter-spacing' },
  { key: 'lineHeight', prefix: 'leading-', category: 'line-height' },
  { key: 'borderRadius', prefix: 'radius-', category: 'radius' },
  { key: 'boxShadow', prefix: 'shadow-', category: 'shadow', joinArray: true },
  { key: 'maxWidth', prefix: 'container-', category: 'container' },
  { key: 'blur', prefix: 'blur-', category: 'blur' },
];

export const TAILWIND_V3_SCALES: readonly Scale[] = [
  ...V3_SHARED_SCALES,
  { key: 'screens', prefix: 'breakpoint-', category: 'breakpoint' },
  { key: 'transitionTimingFunction', prefix: 'ease-', category: 'ease' },
  { key: 'aspectRatio', prefix: 'aspect-', category: 'aspect' },
  { key: 'animation', prefix: 'animate-', category: 'animate' },
];

export const UNO_WIND3_SCALES: readonly Scale[] = [
  ...V3_SHARED_SCALES,
  { key: 'breakpoints', prefix: 'breakpoint-', category: 'breakpoint' },
  { key: 'easing', prefix: 'ease-', category: 'ease' },
];

export const UNO_WIND4_SCALES: readonly Scale[] = [
  { key: 'colors', prefix: 'color-', category: 'color' },
  { key: 'spacing', prefix: 'spacing-', category: 'spacing' },
  { key: 'text', prefix: 'text-', category: 'font-size', leafKey: 'fontSize' },
  { key: 'font', prefix: 'font-', category: 'font-family', joinArray: true },
  { key: 'fontWeight', prefix: 'font-weight-', category: 'font-weight' },
  { key: 'tracking', prefix: 'tracking-', category: 'letter-spacing' },
  { key: 'leading', prefix: 'leading-', category: 'line-height' },
  { key: 'radius', prefix: 'radius-', category: 'radius' },
  { key: 'shadow', prefix: 'shadow-', category: 'shadow', joinArray: true },
  { key: 'breakpoint', prefix: 'breakpoint-', category: 'breakpoint' },
  { key: 'container', prefix: 'container-', category: 'container' },
  { key: 'blur', prefix: 'blur-', category: 'blur' },
  { key: 'ease', prefix: 'ease-', category: 'ease' },
];
