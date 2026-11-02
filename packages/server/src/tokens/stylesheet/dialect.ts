export interface Dialect {
  readonly sigil: string;
  readonly requireBlock: boolean;
  readonly lineComments: boolean;
  readonly interpolation: boolean;
  readonly flags: RegExp;
}

export const CSS_DIALECT: Dialect = {
  sigil: '--',
  requireBlock: true,
  lineComments: false,
  interpolation: false,
  flags: /\s*!\s*important\s*$/i,
};

export const SCSS_DIALECT: Dialect = {
  sigil: '$',
  requireBlock: false,
  lineComments: true,
  interpolation: true,
  flags: /(\s*!\s*(default|global|important))+\s*$/i,
};

export const SCSS_CUSTOM_PROPERTY_DIALECT: Dialect = {
  ...CSS_DIALECT,
  lineComments: true,
  interpolation: true,
};
