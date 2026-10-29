import type { Dependencies } from './package-manifest.js';

const SVG_IMPORT_MODES = ['component', 'url'] as const;
export type SvgImportMode = (typeof SVG_IMPORT_MODES)[number];

export interface SvgVerdict {
  readonly mode: SvgImportMode;
  readonly loader?: string;
  readonly importHint?: string;
  readonly reason: string;
}

interface SvgLoader {
  readonly loader: string;
  readonly importHint: string;
}

const SVG_LOADERS: readonly SvgLoader[] = [
  { loader: 'vite-plugin-svgr', importHint: "import Icon from './icon.svg?react'" },
  { loader: 'vite-svg-loader', importHint: "import Icon from './icon.svg?component'" },
  { loader: 'vite-plugin-solid-svg', importHint: "import Icon from './icon.svg?component-solid'" },
  { loader: '@svgr/webpack', importHint: "import { ReactComponent as Icon } from './icon.svg'" },
  { loader: '@svgr/rollup', importHint: "import Icon from './icon.svg'" },
  {
    loader: 'unplugin-icons',
    importHint:
      "import Icon from '~icons/{collection}/{name}' (local svg via FileSystemIconLoader)",
  },
  { loader: 'nuxt-svgo', importHint: "import Icon from './icon.svg?component' (or <NuxtIcon>)" },
  {
    loader: 'nuxt-svgo-loader',
    importHint: "import Icon from './icon.svg?component' (or a <SvgoIcon name> macro)",
  },
  { loader: '@nuxtjs/svg', importHint: "import Icon from './icon.svg?component'" },
];

export const detectSvgHandling = (deps: Dependencies): SvgVerdict => {
  const match = SVG_LOADERS.find(({ loader }) => loader in deps);
  if (match === undefined) {
    return {
      mode: 'url',
      reason: 'no svg loader dep → svg imports resolve to a URL (use <img src> or inline svg)',
    };
  }
  return {
    mode: 'component',
    loader: match.loader,
    importHint: match.importHint,
    reason: `${match.loader} → svg imports as a component`,
  };
};
