import type {
  ArrowFunctionExpression,
  BindingPattern,
  Class,
  Function,
  ParamPattern,
  TSType,
} from 'oxc-parser';

import { identifierName, objectPatternNames } from './ast-names.js';
import { NO_PROPS, type PropsResult, UNKNOWN_PROPS } from './props-result.js';
import { propsFromType, type TypeTable } from './type-members.js';

export type ComponentFunction = Function | ArrowFunctionExpression;

const COMPONENT_TYPE_WRAPPERS: ReadonlySet<string> = new Set([
  'FC',
  'FunctionComponent',
  'VFC',
  'ComponentType',
  'Component',
  'ParentComponent',
  'VoidComponent',
  'FlowComponent',
]);

const annotationOf = (param: ParamPattern): TSType | undefined =>
  param.type === 'TSParameterProperty' ? undefined : param.typeAnnotation?.typeAnnotation;

export const propsOfFunction = (fn: ComponentFunction, table: TypeTable): PropsResult => {
  const param = fn.params[0];
  if (param === undefined) return NO_PROPS;
  const destructured = param.type === 'ObjectPattern' ? objectPatternNames(param) : [];
  const annotation = annotationOf(param);
  if (annotation !== undefined) {
    const declared = propsFromType(annotation, table);
    return declared.extracted ? declared : { names: destructured, extracted: false };
  }
  return destructured.length > 0 ? { names: destructured, extracted: true } : UNKNOWN_PROPS;
};

export const propsFromComponentType = (binding: BindingPattern, table: TypeTable): PropsResult => {
  const reference = binding.typeAnnotation?.typeAnnotation;
  if (reference?.type !== 'TSTypeReference') return UNKNOWN_PROPS;
  const { typeName } = reference;
  const name = typeName.type === 'TSQualifiedName' ? typeName.right.name : identifierName(typeName);
  if (name === undefined || !COMPONENT_TYPE_WRAPPERS.has(name)) return UNKNOWN_PROPS;
  return propsFromType(reference.typeArguments?.params[0], table);
};

export const propsOfClass = (cls: Class, table: TypeTable): PropsResult =>
  propsFromType(cls.superTypeArguments?.params[0], table);
