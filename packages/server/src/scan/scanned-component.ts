export type ComponentFramework = 'react' | 'vue' | 'svelte' | 'angular';

export type ExportKind = 'default' | 'named';

export interface ScannedComponent {
  readonly name: string;
  readonly filePath: string;
  readonly exportKind: ExportKind;
  readonly propNames: string[];
  readonly propsExtracted: boolean;
  readonly framework: ComponentFramework;
}
