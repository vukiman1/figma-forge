import {
  type ClassNamingStyle,
  type ClassNamingVerdict,
  detectClassNaming,
} from './class-naming.js';
import { COMPONENT_EXTENSIONS, detectFramework, type Framework } from './framework.js';
import { allDependencies, type Dependencies } from './package-manifest.js';
import { gatherProjectInput, type ProjectInput } from './project-input.js';
import type { StylingSystem } from './styling-system.js';
import { detectStyling, type StylingVerdict } from './styling.js';
import { detectSvgHandling, type SvgImportMode, type SvgVerdict } from './svg-handling.js';

export type ProjectLanguage = 'ts' | 'js';

export interface ProfileStyling {
  readonly system: StylingSystem;
  readonly configPath?: string;
  readonly tailwindVersion?: number;
  readonly classNaming?: ClassNamingStyle;
}

export interface ProfileSvg {
  readonly mode: SvgImportMode;
  readonly loader?: string;
  readonly importHint?: string;
}

export interface ProjectProfile {
  readonly rootDir: string;
  readonly framework: Framework;
  readonly language: ProjectLanguage;
  readonly styling: ProfileStyling;
  readonly svg: ProfileSvg;
  readonly componentExtensions: string[];
  readonly evidence: string[];
}

interface LanguageVerdict {
  readonly language: ProjectLanguage;
  readonly reason: string;
}

const detectLanguage = (input: ProjectInput, deps: Dependencies): LanguageVerdict => {
  if (input.hasTsconfig) return { language: 'ts', reason: 'tsconfig.json present' };
  if ('typescript' in deps) return { language: 'ts', reason: 'typescript dep' };
  return { language: 'js', reason: 'no ts signal' };
};

const profileStyling = (
  styling: StylingVerdict,
  classNaming: ClassNamingVerdict,
): ProfileStyling => ({
  system: styling.system,
  ...(styling.configPath === undefined ? {} : { configPath: styling.configPath }),
  ...(styling.tailwindVersion === undefined ? {} : { tailwindVersion: styling.tailwindVersion }),
  ...(classNaming.style === undefined ? {} : { classNaming: classNaming.style }),
});

const profileSvg = (svg: SvgVerdict): ProfileSvg => ({
  mode: svg.mode,
  ...(svg.loader === undefined ? {} : { loader: svg.loader }),
  ...(svg.importHint === undefined ? {} : { importHint: svg.importHint }),
});

export const detectProfile = (input: ProjectInput): ProjectProfile => {
  const deps = allDependencies(input.packageJson);
  const { framework, reason: frameworkReason } = detectFramework(deps);
  const language = detectLanguage(input, deps);
  const styling = detectStyling(deps, input);
  const classNaming = detectClassNaming(input.classNamingTally);
  const svg = detectSvgHandling(deps);
  const version = styling.tailwindVersion === undefined ? '' : ` v${styling.tailwindVersion}`;
  const loader = svg.loader === undefined ? '' : ` (${svg.loader})`;
  return {
    rootDir: input.rootDir,
    framework,
    language: language.language,
    styling: profileStyling(styling, classNaming),
    svg: profileSvg(svg),
    componentExtensions: COMPONENT_EXTENSIONS[framework],
    evidence: [
      `framework=${framework}: ${frameworkReason}`,
      `language=${language.language}: ${language.reason}`,
      `styling=${styling.system}${version}: ${styling.reason}`,
      `classNaming=${classNaming.style ?? 'none'}: ${classNaming.reason}`,
      `svg=${svg.mode}${loader}: ${svg.reason}`,
    ],
  };
};

export const analyzeProject = async (rootDir: string): Promise<ProjectProfile> =>
  detectProfile(await gatherProjectInput(rootDir));
