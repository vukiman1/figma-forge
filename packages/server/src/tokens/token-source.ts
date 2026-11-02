import type { ProjectProfile } from '../profile/project-profile.js';
import type { StylingSystem } from '../profile/styling-system.js';

export type TokenSourceKind = 'css' | 'tailwind-v3' | 'unocss' | 'scss';

export interface TokenSource {
  readonly path: string;
  readonly kind: TokenSourceKind;
}

export interface TokenSourceResolution {
  readonly source: TokenSource | null;
  readonly note?: string;
  readonly refusal?: string;
}

const JS_CONFIG_EXTENSION = /\.[cm]?[jt]s$/i;
const UNO_CONFIG_PATH = /(^|[\\/])(uno|unocss)\.config\.[cm]?[jt]s$/i;
const TAILWIND_CONFIG_PATH = /(^|[\\/])tailwind\.config\.[cm]?[jt]s$/i;

const overrideKind = (path: string, system: StylingSystem): TokenSourceKind => {
  if (/\.scss$/i.test(path)) return 'scss';
  if (!JS_CONFIG_EXTENSION.test(path)) return 'css';
  if (UNO_CONFIG_PATH.test(path)) return 'unocss';
  if (TAILWIND_CONFIG_PATH.test(path)) return 'tailwind-v3';
  return system === 'unocss' ? 'unocss' : 'tailwind-v3';
};

export const resolveTokenSource = (
  profile: Pick<ProjectProfile, 'styling'>,
  override: string | undefined,
): TokenSourceResolution => {
  if (override !== undefined) {
    if (/\.sass$/i.test(override)) {
      return {
        source: null,
        refusal: `token source ${override} is the indented .sass syntax, which is not readable here; pass a .scss or CSS file`,
      };
    }
    return { source: { path: override, kind: overrideKind(override, profile.styling.system) } };
  }
  const path = profile.styling.configPath;
  if (path === undefined)
    return { source: null, note: 'no token source detected; pass tokenSource' };
  if (path.endsWith('.css')) return { source: { path, kind: 'css' } };
  if (JS_CONFIG_EXTENSION.test(path)) {
    const kind = profile.styling.system === 'unocss' ? 'unocss' : 'tailwind-v3';
    return { source: { path, kind } };
  }
  return {
    source: null,
    note: `styling config ${path} is not a readable token source; pass tokenSource`,
  };
};
