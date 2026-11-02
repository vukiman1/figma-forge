import { findTailwindConfig, findUnoConfig } from './config-files.js';
import type { Dependencies } from './package-manifest.js';
import type { ProjectInput } from './project-input.js';
import type { StylingSystem } from './styling-system.js';

export interface StylingVerdict {
  readonly system: StylingSystem;
  readonly configPath?: string;
  readonly tailwindVersion?: number;
  readonly reason: string;
}

interface StylingSignals {
  readonly deps: Dependencies;
  readonly input: ProjectInput;
  readonly tailwindMajor: number | undefined;
  readonly hasTailwindV4Package: boolean;
  readonly unoGeneratesUtilities: boolean;
}

type StylingDetector = (signals: StylingSignals) => StylingVerdict | undefined;

const TAILWIND_V3 = 3;
const TAILWIND_V4 = 4;
const TAILWIND_V4_PACKAGES = ['@tailwindcss/vite', '@tailwindcss/postcss'];
const UNOCSS_PACKAGE = 'unocss';
const UNOCSS_SCOPE = '@unocss/';
const UNOCSS_NON_VOCABULARY_PACKAGES: ReadonlySet<string> = new Set([
  '@unocss/reset',
  '@unocss/preset-icons',
  '@unocss/preset-web-fonts',
  '@unocss/preset-typography',
  '@unocss/preset-attributify',
  '@unocss/preset-tagify',
]);
const SASS_COMPILERS = ['sass', 'sass-embedded', 'node-sass'];
const UNKNOWN_STYLING: StylingVerdict = {
  system: 'unknown',
  reason: 'no styling signal in manifest',
};

const parseMajor = (range: string | undefined): number | undefined => {
  const digits = range === undefined ? null : /(\d+)/.exec(range);
  return digits === null ? undefined : Number(digits[1]);
};

const fromTailwindConfig: StylingDetector = ({ input, tailwindMajor }) => {
  const config = findTailwindConfig(input.presentConfigFiles);
  if (config === undefined) return undefined;
  const tailwindVersion = tailwindMajor ?? TAILWIND_V3;
  return { system: 'tailwind', configPath: config, tailwindVersion, reason: `found ${config}` };
};

const hasLiveTailwindV4 = ({ input, tailwindMajor, hasTailwindV4Package }: StylingSignals) =>
  input.tailwindCssEntry !== undefined &&
  ((tailwindMajor ?? 0) >= TAILWIND_V4 || hasTailwindV4Package);

const fromUnoConfig: StylingDetector = signals => {
  const config = findUnoConfig(signals.input.presentConfigFiles);
  if (config === undefined || hasLiveTailwindV4(signals) || !signals.unoGeneratesUtilities) {
    return undefined;
  }
  return { system: 'unocss', configPath: config, reason: `found ${config}` };
};

const fromTailwindCssEntry: StylingDetector = ({ input, tailwindMajor }) => {
  const entry = input.tailwindCssEntry;
  if (entry === undefined) return undefined;
  const tailwindVersion = tailwindMajor ?? TAILWIND_V4;
  const reason = `Tailwind v4 CSS config: ${entry}`;
  return { system: 'tailwind', configPath: entry, tailwindVersion, reason };
};

const fromTailwindDependency: StylingDetector = ({ tailwindMajor, hasTailwindV4Package }) => {
  if (tailwindMajor === undefined && !hasTailwindV4Package) return undefined;
  const reason = hasTailwindV4Package
    ? '@tailwindcss/* package in dependencies'
    : 'tailwindcss in dependencies';
  return { system: 'tailwind', tailwindVersion: tailwindMajor ?? TAILWIND_V4, reason };
};

const isUnoVocabularyPackage = (name: string): boolean =>
  name === UNOCSS_PACKAGE ||
  (name.startsWith(UNOCSS_SCOPE) && !UNOCSS_NON_VOCABULARY_PACKAGES.has(name));

const fromUnoDependency: StylingDetector = ({ deps, unoGeneratesUtilities }) => {
  const dependency = Object.keys(deps).find(isUnoVocabularyPackage);
  if (dependency === undefined || !unoGeneratesUtilities) return undefined;
  return { system: 'unocss', reason: `${dependency} in dependencies` };
};

const fromSassDependency: StylingDetector = ({ deps }) => {
  const dependency = SASS_COMPILERS.find(name => name in deps);
  return dependency === undefined
    ? undefined
    : { system: 'scss', reason: `${dependency} in dependencies` };
};

const STYLING_CASCADE: readonly StylingDetector[] = [
  fromTailwindConfig,
  fromUnoConfig,
  fromTailwindCssEntry,
  fromTailwindDependency,
  fromUnoDependency,
  fromSassDependency,
];

const withCssScanCaveat = (styling: StylingVerdict, input: ProjectInput): StylingVerdict => {
  if (input.tailwindCssEntry !== undefined || input.cssScanOmitted === 0) return styling;
  const caveat = `the Tailwind v4 CSS-entry scan hit its file cap with ${input.cssScanOmitted} .css file(s) unread, so a v4 entry cannot be ruled out`;
  return { ...styling, reason: `${styling.reason} (${caveat})` };
};

export const detectStyling = (deps: Dependencies, input: ProjectInput): StylingVerdict => {
  const signals: StylingSignals = {
    deps,
    input,
    tailwindMajor: parseMajor(deps.tailwindcss),
    hasTailwindV4Package: TAILWIND_V4_PACKAGES.some(name => name in deps),
    unoGeneratesUtilities: input.unoConfigDeclaresVocabulary !== false,
  };
  for (const detect of STYLING_CASCADE) {
    const verdict = detect(signals);
    if (verdict !== undefined) return withCssScanCaveat(verdict, input);
  }
  return withCssScanCaveat(UNKNOWN_STYLING, input);
};
