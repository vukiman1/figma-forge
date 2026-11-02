import type { Dependencies } from './package-manifest.js';

const FRAMEWORKS = [
  'next',
  'nuxt',
  'react',
  'vue',
  'svelte',
  'solid',
  'angular',
  'unknown',
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export interface FrameworkVerdict {
  readonly framework: Framework;
  readonly reason: string;
}

const JSX_EXTENSIONS = ['.tsx', '.jsx'];

export const COMPONENT_EXTENSIONS: Readonly<Record<Framework, string[]>> = {
  next: JSX_EXTENSIONS,
  react: JSX_EXTENSIONS,
  nuxt: ['.vue'],
  vue: ['.vue'],
  svelte: ['.svelte'],
  solid: JSX_EXTENSIONS,
  angular: ['.ts'],
  unknown: [...JSX_EXTENSIONS, '.vue', '.svelte'],
};

const FRAMEWORK_DEPENDENCIES: readonly (readonly [dependency: string, framework: Framework])[] = [
  ['next', 'next'],
  ['nuxt', 'nuxt'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['svelte', 'svelte'],
  ['solid-js', 'solid'],
  ['@angular/core', 'angular'],
];

export const detectFramework = (deps: Dependencies): FrameworkVerdict => {
  const match = FRAMEWORK_DEPENDENCIES.find(([dependency]) => dependency in deps);
  if (match === undefined) return { framework: 'unknown', reason: 'no known framework dependency' };
  const [dependency, framework] = match;
  return { framework, reason: `${dependency} in dependencies` };
};
