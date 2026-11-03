import { describe, expect, it } from 'vitest';

import {
  diceSimilarity,
  type FigmaComponentUsage,
  joinComponents,
} from '../../src/join/component-map.js';
import type { ScannedComponent } from '../../src/scan/scanned-component.js';

const comp = (name: string, propNames: string[] = []): ScannedComponent => ({
  name,
  filePath: `src/components/${name}.tsx`,
  exportKind: 'named',
  propNames,
  propsExtracted: true,
  framework: 'react',
});

const usage = (over: Partial<FigmaComponentUsage> & { name: string }): FigmaComponentUsage => ({
  variantAxes: [],
  instances: [{ nodeId: '1:1' }],
  instanceCount: 1,
  ...over,
});

describe('diceSimilarity', () => {
  it('is 1 for identical and 0 for disjoint', () => {
    expect(diceSimilarity('button', 'button')).toBe(1);
    expect(diceSimilarity('button', 'xyzwq')).toBeLessThan(0.2);
  });
  it('scores near-matches highly', () => {
    expect(diceSimilarity('button', 'buttons')).toBeGreaterThan(0.8);
  });
});

describe('joinComponents', () => {
  const scanned = [comp('Button', ['size', 'variant']), comp('Card'), comp('Avatar')];

  it('maps an exact name as high confidence', () => {
    const [m] = joinComponents([usage({ name: 'Button' })], scanned, { threshold: 0.7 });
    expect(m?.candidate?.name).toBe('Button');
    expect(m?.candidate?.confidence).toBe(1);
    expect(m?.status).toBe('high');
    expect(m?.source).toBe('scan');
  });

  it('strips Figma variant/slash decoration before matching', () => {
    const [m] = joinComponents([usage({ name: 'Button/Primary' })], scanned, { threshold: 0.7 });
    expect(m?.candidate?.name).toBe('Button');
    expect(m?.status).toBe('high');
  });

  it('rewards variant axes that match code props, recording them', () => {
    const [m] = joinComponents(
      [usage({ name: 'Buton', variantAxes: ['Size', 'Variant'] })],
      scanned,
      { threshold: 0.7 },
    );
    expect(m?.candidate?.name).toBe('Button');
    expect(m?.candidate?.matchedProps).toEqual(['Size', 'Variant']);
  });

  it('reports Figma axes the candidate lacks as unmatchedProps (extension TODOs)', () => {
    const [m] = joinComponents(
      [usage({ name: 'Button', variantAxes: ['Size', 'Variant', 'Show icon_L', 'State'] })],
      scanned,
      { threshold: 0.7 },
    );
    expect(m?.candidate?.matchedProps).toEqual(['Size', 'Variant']);
    expect(m?.candidate?.unmatchedProps).toEqual(['Show icon_L', 'State']);
  });

  it('diffs props on the override path too, resolving the scanned component', () => {
    const overrides = new Map([['btn', { name: 'Button', filePath: 'src/components/Button.tsx' }]]);
    const [m] = joinComponents(
      [usage({ name: 'btn', variantAxes: ['Size', 'Show icon_L'] })],
      scanned,
      { threshold: 0.7, overrides },
    );
    expect(m?.source).toBe('map-file');
    expect(m?.candidate?.matchedProps).toEqual(['Size']);
    expect(m?.candidate?.unmatchedProps).toEqual(['Show icon_L']);
  });

  it('matches multi-word Figma axes against camelCase props', () => {
    const [m] = joinComponents(
      [
        usage({
          name: 'Button',
          variantAxes: ['Show icon', 'Is Disabled', 'icon-position', 'Full width', 'State'],
        }),
      ],
      [comp('Button', ['showIcon', 'isDisabled', 'iconPosition', 'fullWidth'])],
      { threshold: 0.7 },
    );
    expect(m?.candidate?.matchedProps).toEqual([
      'Show icon',
      'Is Disabled',
      'icon-position',
      'Full width',
    ]);
    expect(m?.candidate?.unmatchedProps).toEqual(['State']);
  });

  it('does not match a name to an unrelated one in another script', () => {
    const jp: ScannedComponent = {
      name: 'ボタン',
      filePath: 'src/components/ボタン.vue',
      exportKind: 'default',
      propNames: [],
      propsExtracted: true,
      framework: 'vue',
    };
    const [m] = joinComponents([usage({ name: '按鈕' })], [jp], { threshold: 0.7 });
    expect(m?.status).toBe('unmapped');
    expect(m?.candidate).toBeUndefined();
  });

  it('matches an accented Figma name to its ASCII code identifier', () => {
    const [m] = joinComponents([usage({ name: 'Café' })], [comp('Cafe')], { threshold: 0.7 });
    expect(m?.candidate?.name).toBe('Cafe');
    expect(m?.candidate?.confidence).toBe(1);
  });

  it('matches components and axes named in a non-Latin script', () => {
    const cjk: ScannedComponent = {
      name: '按鈕',
      filePath: 'src/components/按鈕.vue',
      exportKind: 'default',
      propNames: ['尺寸', '是否停用'],
      propsExtracted: true,
      framework: 'vue',
    };
    const [m] = joinComponents(
      [usage({ name: '按鈕/主要', variantAxes: ['尺寸', '是否停用'] })],
      [cjk],
      { threshold: 0.7 },
    );
    expect(m?.candidate?.name).toBe('按鈕');
    expect(m?.status).toBe('high');
    expect(m?.candidate?.matchedProps).toEqual(['尺寸', '是否停用']);
  });

  it('reports proven matches off an incomplete prop list, but claims nothing is missing', () => {
    const partial: ScannedComponent = {
      name: 'Button',
      filePath: 'src/app/button.component.ts',
      exportKind: 'named',
      propNames: ['size'],
      propsExtracted: false,
      framework: 'angular',
    };
    const [m] = joinComponents(
      [usage({ name: 'Button', variantAxes: ['Size', 'Tone'] })],
      [partial],
      { threshold: 0.7 },
    );
    expect(m?.candidate?.matchedProps).toEqual(['Size']);
    expect(m?.candidate?.unmatchedProps).toEqual([]);
  });

  it('suppresses unmatchedProps when the candidate props were not extracted (SFC baseline)', () => {
    const vue: ScannedComponent = {
      name: 'Button',
      filePath: 'src/components/Button.vue',
      exportKind: 'default',
      propNames: [],
      propsExtracted: false,
      framework: 'vue',
    };
    const [m] = joinComponents(
      [usage({ name: 'Button', variantAxes: ['Size', 'Variant'] })],
      [vue],
      { threshold: 0.7 },
    );
    expect(m?.candidate?.name).toBe('Button');
    expect(m?.candidate?.matchedProps).toEqual([]);
    expect(m?.candidate?.unmatchedProps).toEqual([]);
  });

  it.each(['Size=Large, State=Hover', 'Type=Primary', 'State=Default, Size=Medium'])(
    'does not mine a component name out of the variant decoration in %s',
    name => {
      const ds = [comp('Size'), comp('State'), comp('Type'), comp('Button')];
      const [m] = joinComponents([usage({ name })], ds, { threshold: 0.7 });
      expect(m?.status).not.toBe('high');
      expect(m?.candidate?.confidence ?? 0).toBeLessThan(0.85);
    },
  );

  it.each(['Button/Size=Large, State=Hover', 'Button/Primary', 'Button, Large'])(
    'still recovers the component name from %s',
    name => {
      const ds = [comp('Button'), comp('Card'), comp('Size')];
      const [m] = joinComponents([usage({ name })], ds, { threshold: 0.7 });
      expect(m?.candidate?.name).toBe('Button');
      expect(m?.status).toBe('high');
    },
  );

  it('honours a threshold raised above the absolute high mark', () => {
    const scanned2 = [comp('Button')];
    const at = (threshold: number) =>
      joinComponents([usage({ name: 'Buton' })], scanned2, { threshold })[0];
    expect(at(0.7)?.status).toBe('high');
    expect(at(0.95)?.status).toBe('low');
    expect(at(0.95)?.candidate?.name).toBe('Button');
  });

  it('flags unmapped when nothing is close', () => {
    const [m] = joinComponents([usage({ name: 'Tooltip' })], scanned, { threshold: 0.7 });
    expect(m?.status).toBe('unmapped');
    expect(m?.candidate).toBeUndefined();
  });

  it('surfaces a near-tie runner-up on ambiguousWith and never presents it as a confident high', () => {
    const twins = [comp('NavBar'), comp('Navbar')];
    const [m] = joinComponents([usage({ name: 'NavBar' })], twins, { threshold: 0.7 });

    expect(m?.candidate?.name).toBe('NavBar');
    expect(m?.candidate?.ambiguousWith).toEqual([
      { name: 'Navbar', filePath: 'src/components/Navbar.tsx' },
    ]);

    expect(m?.status).toBe('medium');
  });

  it('does not flag a distant runner-up (below the tie epsilon)', () => {
    const [m] = joinComponents([usage({ name: 'Card' })], scanned, { threshold: 0.7 });
    expect(m?.status).toBe('high');
    expect(m?.candidate?.ambiguousWith).toBeUndefined();
  });

  it('caps the surfaced runner-ups instead of dumping a long list', () => {
    const sibs = ['NavBar', 'Navbar', 'NAVBAR', 'Nav_Bar', 'Nav-Bar'].map(n => comp(n));
    const [m] = joinComponents([usage({ name: 'NavBar' })], sibs, { threshold: 0.7 });
    expect(m?.candidate?.ambiguousWith).toHaveLength(3);
  });

  it('trusts an override whose file is on disk even when the scan did not parse it', () => {
    const overrides = new Map([['Tooltip', { name: 'Tip', filePath: 'src/ui/Tip.tsx' }]]);
    const [m] = joinComponents([usage({ name: 'Tooltip' })], scanned, {
      threshold: 0.7,
      overrides,
      overridesOnDisk: new Set(['Tooltip']),
    });
    expect(m?.candidate?.name).toBe('Tip');
    expect(m?.candidate?.confidence).toBe(1);
    expect(m?.source).toBe('map-file');
    expect(m?.staleOverride).toBeUndefined();
  });

  it('degrades a stale override (target neither scanned nor on disk) and flags it', () => {
    const overrides = new Map([['Tooltip', { name: 'Tip', filePath: 'src/ui/Tip.tsx' }]]);
    const [m] = joinComponents([usage({ name: 'Tooltip' })], scanned, {
      threshold: 0.7,
      overrides,
    });
    expect(m?.status).toBe('unmapped');
    expect(m?.source).toBe('scan');
    expect(m?.staleOverride).toEqual({ name: 'Tip', filePath: 'src/ui/Tip.tsx' });
  });

  it('a stale override still recovers the fuzzy match when one exists (better than a phantom)', () => {
    const overrides = new Map([['Button', { name: 'Gone', filePath: 'src/ui/Gone.tsx' }]]);
    const [m] = joinComponents([usage({ name: 'Button' })], scanned, { threshold: 0.7, overrides });
    expect(m?.candidate?.name).toBe('Button');
    expect(m?.source).toBe('scan');
    expect(m?.staleOverride).toEqual({ name: 'Gone', filePath: 'src/ui/Gone.tsx' });
  });
});
