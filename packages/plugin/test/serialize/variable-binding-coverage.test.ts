import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const resolveFrom = createRequire(import.meta.url);

const HANDLED: Record<string, string> = {
  Node: "serialize/style-links.ts collectBoundVariables — a node's own boundVariables",
  Text: 'serialize/style-links.ts collectBoundVariables (TEXT nodes) + get-styles.ts for a TextStyle',
  Paint: 'serialize/paint.ts serializePaint, SOLID branch',
  ColorStop: 'serialize/paint-gradient.ts serializeGradient, gradient-stop branch',
  Effect: 'serialize/effect.ts serializeEffect, both branches',
  LayoutGrid: 'serialize/layout-grid.ts serializeLayoutGrid, both branches',
  ComponentProperty:
    'serialize/component-properties.ts collectComponentProperties reports the value, not its binding',
  ComponentPropertyDefinition:
    'not serialized — get_component_api reports definitions, not bindings',
  PaintStyle: 'deliberately not read — lossy summary of the per-paint bindings (see get-styles.ts)',
  EffectStyle: 'deliberately not read — lossy summary of the per-effect bindings',
  GridStyle: 'deliberately not read — lossy summary of the per-grid bindings',
};

describe('variable-binding coverage vs @figma/plugin-typings', () => {
  const pkg = dirname(resolveFrom.resolve('@figma/plugin-typings/package.json'));
  const dts = join(pkg, 'plugin-api.d.ts');

  it('finds the typings it audits', () => {
    expect(existsSync(dts)).toBe(true);
  });

  it('accounts for every bindable surface the typings declare', () => {
    const source = readFileSync(dts, 'utf8');
    const families = [...source.matchAll(/^type VariableBindable(\w+)Field =/gm)].map(m => m[1]!);
    expect(families.length).toBeGreaterThan(5);

    const unhandled = families.filter(f => !Object.hasOwn(HANDLED, f));
    const stale = Object.keys(HANDLED).filter(f => !families.includes(f));
    expect({ unhandled, stale }).toEqual({
      unhandled: [],
      stale: [],
      ...(unhandled.length > 0
        ? {
            hint:
              `Figma made a new kind of object variable-bindable (${unhandled.join(', ')}). ` +
              'Decide where its binding is read — the object that owns it, the way serializePaint / ' +
              'serializeEffect / serializeLayoutGrid do — then record it in HANDLED. Leaving it ' +
              'unread reproduces issue #164: a bound value comes back as a plain literal.',
          }
        : {}),
      ...(stale.length > 0
        ? { hint: `Removed from the typings: ${stale.join(', ')} — drop it from HANDLED.` }
        : {}),
    });
  });
});
