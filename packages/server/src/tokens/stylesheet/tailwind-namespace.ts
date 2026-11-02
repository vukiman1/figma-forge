export interface TailwindNamespace {
  readonly utility: string;
  readonly category: string;
}

const NAMESPACES: ReadonlyArray<readonly [prefix: string, category: string]> = [
  ['color-', 'color'],
  ['font-weight-', 'font-weight'],
  ['font-', 'font-family'],
  ['text-', 'font-size'],
  ['tracking-', 'letter-spacing'],
  ['leading-', 'line-height'],
  ['spacing-', 'spacing'],
  ['radius-', 'radius'],
  ['shadow-', 'shadow'],
  ['breakpoint-', 'breakpoint'],
  ['container-', 'container'],
  ['blur-', 'blur'],
  ['aspect-', 'aspect'],
  ['ease-', 'ease'],
  ['animate-', 'animate'],
];

export const tailwindNamespaceOf = (name: string): TailwindNamespace | undefined => {
  const entry = NAMESPACES.find(([prefix]) => name.startsWith(prefix));
  if (entry === undefined) return undefined;
  const [prefix, category] = entry;
  return { utility: name.slice(prefix.length), category };
};
