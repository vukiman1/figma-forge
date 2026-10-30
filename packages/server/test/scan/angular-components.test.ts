import { describe, expect, it } from 'vitest';

import { extractAngularComponents } from '../../src/scan/angular-components.js';

describe('extractAngularComponents (pure)', () => {
  it('extracts classic @Input() props and strips the Component suffix so ButtonComponent matches a Figma Button', () => {
    const code = `
      import { Component, Input } from '@angular/core';
      @Component({ selector: 'app-button', standalone: true, template: '' })
      export class ButtonComponent {
        @Input() size = 'md';
        @Input() disabled = false;
      }
    `;
    const [c] = extractAngularComponents('src/app/button/button.component.ts', code);
    expect(c?.name).toBe('Button');
    expect(c?.framework).toBe('angular');
    expect(c?.exportKind).toBe('named');
    expect(c?.propNames).toEqual(['size', 'disabled']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('extracts signal inputs (input / input.required / model) alongside decorator inputs', () => {
    const code = `
      import { Component, Input, input, model } from '@angular/core';
      @Component({ selector: 'app-card', template: '' })
      export class CardComponent {
        @Input() elevated = false;
        title = input.required<string>();
        count = input(0);
        selected = model(false);
      }
    `;
    const [c] = extractAngularComponents('card.component.ts', code);
    expect(c?.propNames).toEqual(['elevated', 'title', 'count', 'selected']);
  });

  it('does not mistake signal / computed state, viewChild queries or outputs for inputs', () => {
    const code = `
      import { Component, signal, computed, input, output, viewChild } from '@angular/core';
      @Component({ selector: 'app-widget', template: '' })
      export class WidgetComponent {
        label = input('');
        count = signal(0);
        doubled = computed(() => this.count() * 2);
        changed = output<number>();
        ref = viewChild('el');
      }
    `;
    const [c] = extractAngularComponents('widget.component.ts', code);
    expect(c?.propNames).toEqual(['label']);
  });

  it('uses the @Input alias (string and object form) as the bound name and reads set-accessor inputs', () => {
    const code = `
      import { Component, Input } from '@angular/core';
      @Component({ template: '' })
      export class FieldComponent {
        @Input('variant') kind = 'primary';
        @Input({ alias: 'isBusy', required: true }) busy!: boolean;
        @Input() set active(v: boolean) {}
      }
    `;
    const [c] = extractAngularComponents('field.component.ts', code);
    expect(c?.propNames).toEqual(['variant', 'isBusy', 'active']);
  });

  it('skips non-component classes (@Injectable / @Directive / plain) and anonymous classes', () => {
    const code = `
      import { Injectable, Directive } from '@angular/core';
      @Injectable() export class DataService {}
      @Directive({ selector: '[appHi]' }) export class HiDirective {}
      export class PlainThing {}
    `;
    expect(extractAngularComponents('x.ts', code)).toEqual([]);
  });

  it('uses the alias of a signal input from either argument slot as the public prop name', () => {
    const code = `
      import { Component, input, model } from '@angular/core';
      @Component({ template: '' })
      export class FieldComponent {
        kind = input('primary', { alias: 'variant' });
        busy = input.required<boolean>({ alias: 'isBusy' });
        val = model('x', { alias: 'value' });
      }
    `;
    const [c] = extractAngularComponents('field.component.ts', code);
    expect(c?.propNames).toEqual(['variant', 'isBusy', 'value']);
  });

  it('reads inputs declared in the @Component metadata, binding `field: alias` as the alias', () => {
    const code = `
      import { Component } from '@angular/core';
      @Component({ selector: 'app-b', template: '', inputs: ['size', 'kind: variant'] })
      export class ButtonComponent {}
    `;
    const [c] = extractAngularComponents('button.component.ts', code);
    expect(c?.propNames).toEqual(['size', 'variant']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('folds inputs inherited from a base class declared in the same file', () => {
    const code = `
      import { Component, Directive, Input } from '@angular/core';
      @Directive()
      export class BaseComponent { @Input() tone = 'a'; }
      @Component({ template: '' })
      export class ButtonComponent extends BaseComponent { @Input() size = 'md'; }
    `;
    const [c] = extractAngularComponents('button.component.ts', code);
    expect(c?.name).toBe('Button');
    expect(c?.propNames.toSorted()).toEqual(['size', 'tone']);
    expect(c?.propsExtracted).toBe(true);
  });

  it.each([
    [
      'an imported base',
      `import { BaseComponent } from './base';\n@Component({ template: '' })\nexport class ButtonComponent extends BaseComponent { @Input() size = 'md'; }`,
    ],
    [
      'a namespaced base',
      `@Component({ template: '' })\nexport class ButtonComponent extends NS.BaseComponent { @Input() size = 'md'; }`,
    ],
    [
      'a mixin base',
      `@Component({ template: '' })\nexport class ButtonComponent extends mixin(Base) { @Input() size = 'md'; }`,
    ],
  ])('flags the input list incomplete but keeps the class own inputs for %s', (_label, body) => {
    const [c] = extractAngularComponents(
      'button.component.ts',
      `import { Component, Input } from '@angular/core';\n${body}`,
    );
    expect(c?.name).toBe('Button');
    expect(c?.propsExtracted).toBe(false);
    expect(c?.propNames).toEqual(['size']);
  });

  it('does not crash on unparseable source', () => {
    expect(extractAngularComponents('x.ts', 'export class = = =')).toEqual([]);
  });
});
