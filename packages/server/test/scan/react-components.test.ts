import { describe, expect, it } from 'vitest';

import { extractReactComponents } from '../../src/scan/react-components.js';

describe('extractReactComponents (pure)', () => {
  it('finds named function + arrow components and their destructured props', () => {
    const code = `
      export function Button({ size, variant }) { return <button/>; }
      export const Card = ({ title }) => <div>{title}</div>;
    `;
    const comps = extractReactComponents('ui/Button.tsx', code);
    const button = comps.find(c => c.name === 'Button');
    const card = comps.find(c => c.name === 'Card');
    expect(button?.propNames).toEqual(['size', 'variant']);
    expect(button?.exportKind).toBe('named');
    expect(card?.propNames).toEqual(['title']);
  });

  it('excludes non-component exports (non-PascalCase / non-function)', () => {
    const code = `
      export const API_URL = 'x';
      export const useThing = () => 1;
      function helper() {}
      export { helper };
    `;
    expect(extractReactComponents('x.tsx', code)).toEqual([]);
  });

  it('unwraps forwardRef/memo HOCs, leaving an un-annotated `props` param unextracted', () => {
    const code = `
      import { forwardRef, memo } from 'react';
      export const Icon = forwardRef((props, ref) => <svg ref={ref}/>);
      export const Badge = memo(({ label }) => <span>{label}</span>);
    `;
    const comps = extractReactComponents('x.tsx', code);
    expect(comps.map(c => c.name).toSorted()).toEqual(['Badge', 'Icon']);
    expect(comps.find(c => c.name === 'Icon')?.propsExtracted).toBe(false);
    expect(comps.find(c => c.name === 'Badge')?.propNames).toEqual(['label']);
  });

  it('unwraps namespaced and nested HOCs (React.memo, memo(forwardRef(...)))', () => {
    const code = `
      export const Icon = React.memo(({ size }) => <svg/>);
      export const Chip = React.forwardRef(({ tone }, ref) => <span ref={ref}/>);
      export const Tag = memo(forwardRef(({ label }, ref) => <b ref={ref}/>));
    `;
    const comps = extractReactComponents('x.tsx', code);
    expect(comps.map(c => c.name).toSorted()).toEqual(['Chip', 'Icon', 'Tag']);
    expect(comps.find(c => c.name === 'Tag')?.propNames).toEqual(['label']);
  });

  it('resolves components exported by reference, reporting one exported both ways once', () => {
    const code = `
      interface Props { size?: string }
      const Button = ({ size }: Props) => <button/>;
      function Card({ title }: { title: string }) { return <div/>; }
      const Inner = ({ tone }: { tone: string }) => <i/>;
      export { Button, Card, Inner as Badge };
      export default Button;
    `;
    const comps = extractReactComponents('ui/Button.tsx', code);
    expect(comps.map(c => c.name).toSorted()).toEqual(['Badge', 'Button', 'Card']);
    expect(comps.find(c => c.name === 'Badge')?.propNames).toEqual(['tone']);
    expect(comps.filter(c => c.name === 'Button')).toHaveLength(1);
  });

  it('names a default-exported binding after the binding, not the file', () => {
    const code = `const Button = ({ size }: { size?: string }) => <button/>;\nexport default Button;`;
    const [c] = extractReactComponents('ui/index.tsx', code);
    expect(c?.name).toBe('Button');
    expect(c?.exportKind).toBe('default');
    expect(c?.propNames).toEqual(['size']);
  });

  it('ignores type-only exports and barrel re-exports, which the re-exported file reports itself', () => {
    const code = `
      interface Props { size?: string }
      export type { Props };
      export { Button } from './Button';
    `;
    expect(extractReactComponents('index.tsx', code)).toEqual([]);
  });

  it('extracts class components and their props', () => {
    const code = `
      interface Props { size?: string; tone: string }
      export class Button extends React.Component<Props> { render() { return <button/>; } }
      export class Chip extends PureComponent<{ label: string }> { render() { return <b/>; } }
      export class NotAComponent extends Base { }
    `;
    const comps = extractReactComponents('x.tsx', code);
    expect(comps.map(c => c.name).toSorted()).toEqual(['Button', 'Chip']);
    expect(comps.find(c => c.name === 'Button')?.propNames.toSorted()).toEqual(['size', 'tone']);
    expect(comps.find(c => c.name === 'Chip')?.propNames).toEqual(['label']);
  });

  it.each([
    ['a plain annotated parameter', `export const Button = (props: Props) => <button/>;`],
    [
      'a body destructure',
      `export function Button(props: Props) { const { size } = props; return <button/>; }`,
    ],
    ['React.FC on the binding', `export const Button: React.FC<Props> = (props) => <button/>;`],
    ['FC on a binding that ignores them', `export const Button: FC<Props> = () => <button/>;`],
  ])('reads props declared via %s', (_label, form) => {
    const code = `interface Props { size?: string; tone: string }\n${form}`;
    const [c] = extractReactComponents('x.tsx', code);
    expect(c?.propNames.toSorted()).toEqual(['size', 'tone']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('resolves type aliases, intersections and interface inheritance declared in the file', () => {
    const code = `
      interface Base { tone: string }
      interface Props extends Base { size?: string }
      type Extra = { id: string };
      type CardProps = Extra & { title: string };
      export const Button = (props: Props) => <button/>;
      export const Card = (props: CardProps) => <div/>;
    `;
    const comps = extractReactComponents('x.tsx', code);
    expect(comps.find(c => c.name === 'Button')?.propNames.toSorted()).toEqual(['size', 'tone']);
    expect(comps.find(c => c.name === 'Card')?.propNames.toSorted()).toEqual(['id', 'title']);
  });

  it.each([
    [
      'imported prop type',
      `import type { Props } from './t';\nexport const Button = (props: Props) => <button/>;`,
    ],
    [
      'interface extending an imported one',
      `import type { Base } from './t';\ninterface Props extends Base { size?: string }\nexport const Button = (props: Props) => <button/>;`,
    ],
    [
      'intersection with an imported type',
      `import type { Base } from './t';\ntype Props = Base & { size?: string };\nexport const Button = (props: Props) => <button/>;`,
    ],
    [
      'a utility generic',
      `interface Base { size?: string }\nexport const Button = (props: Partial<Base>) => <button/>;`,
    ],
    ['an un-annotated parameter', `export const Button = (props) => <button/>;`],
  ])('reports props as NOT extracted for %s', (_label, code) => {
    const [c] = extractReactComponents('x.tsx', code);
    expect(c?.name).toBe('Button');
    expect(c?.propsExtracted).toBe(false);
    expect(c?.propNames).toEqual([]);
  });

  it('resolves a generic component type but not a utility type that reshapes the member set', () => {
    const generic = `interface Props<T> { items: T[]; size?: string }\nexport const List = <T,>({ items }: Props<T>) => <ul/>;`;
    const [g] = extractReactComponents('x.tsx', generic);
    expect(g?.propNames.toSorted()).toEqual(['items', 'size']);
    expect(g?.propsExtracted).toBe(true);

    const utility = `interface Props { size?: string }\nexport const B = (p: Omit<Props, 'size'>) => <i/>;`;
    expect(extractReactComponents('x.tsx', utility)[0]?.propsExtracted).toBe(false);
  });

  it('prefers the declared prop type over what the body destructures', () => {
    const code = `interface Props { size?: string; tone?: string }\nexport const B = ({ size }: Props) => <i/>;`;
    const [c] = extractReactComponents('x.tsx', code);
    expect(c?.propNames.toSorted()).toEqual(['size', 'tone']);
  });

  it('treats a rest-only pattern as unknown unless an annotation names the props', () => {
    const [c] = extractReactComponents('x.tsx', 'export const B = ({ ...rest }) => <i/>;');
    expect(c?.propsExtracted).toBe(false);
    const typed = `interface Props { size?: string }\nexport const B = ({ ...rest }: Props) => <i/>;`;
    expect(extractReactComponents('x.tsx', typed)[0]?.propNames).toEqual(['size']);
  });

  it('resolves `export { X as default }` as a default export named after the binding', () => {
    const code = `const Button = ({ size }: { size?: string }) => <button/>;\nexport { Button as default };`;
    const [c] = extractReactComponents('ui/Button.tsx', code);
    expect(c?.name).toBe('Button');
    expect(c?.exportKind).toBe('default');
    expect(c?.propNames).toEqual(['size']);
  });

  it('reads props of a Solid component, which never destructures them, including its ParentComponent type', () => {
    const P = 'interface Props { size?: string; tone?: string }\n';
    const [fn] = extractReactComponents(
      'x.tsx',
      `${P}export function Button(props: Props) { return <b>{props.size}</b>; }`,
    );
    expect(fn?.propNames.toSorted()).toEqual(['size', 'tone']);
    expect(fn?.propsExtracted).toBe(true);
    const [typed] = extractReactComponents(
      'x.tsx',
      `${P}export const Button: ParentComponent<Props> = (props) => <b/>;`,
    );
    expect(typed?.propNames.toSorted()).toEqual(['size', 'tone']);
  });

  it('treats a component with no parameter as genuinely prop-less rather than unknown', () => {
    const [c] = extractReactComponents('x.tsx', 'export const Button = () => <button/>;');
    expect(c?.propNames).toEqual([]);
    expect(c?.propsExtracted).toBe(true);
  });

  it('does not mistake a cyclic type for an unreadable one', () => {
    const code = `
      interface A extends B { a?: string }
      interface B extends A { b?: string }
      export const Button = (props: A) => <button/>;
    `;
    const [c] = extractReactComponents('x.tsx', code);
    expect(c?.propNames.toSorted()).toEqual(['a', 'b']);
  });

  it('names an anonymous default export from the filename', () => {
    const comps = extractReactComponents(
      'components/UserCard.tsx',
      'export default function() { return <div/>; }',
    );
    expect(comps[0]?.name).toBe('UserCard');
    expect(comps[0]?.exportKind).toBe('default');
  });

  it('does not crash on unparseable source', () => {
    expect(extractReactComponents('x.tsx', 'export const = = =')).toEqual([]);
  });
});
