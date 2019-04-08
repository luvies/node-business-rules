import { ExpressionReturnType } from './expression-evaluator';

/**
 * Checks whether the identifier exists as an own property on the
 * given object.
 */
export function objectOwnPropertyMemberCheck(
  value: ExpressionReturnType,
  ident: string | number,
): boolean {
  return (
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, ident)
  );
}

const stringMethods = new Set([
  'charAt',
  'charCodeAt',
  'codePointAt',
  'concat',
  'includes',
  'endsWith',
  'indexOf',
  'lastIndexOf',
  'localeCompare',
  'match',
  'matchAll',
  'normalize',
  'padEnd',
  'padStart',
  'repeat',
  'replace',
  'search',
  'slice',
  'split',
  'startsWith',
  'substring',
  'toLocaleLowerCase',
  'toLocaleUpperCase',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'trimStart',
  'trimLeft',
  'trimEnd',
  'trimRight',
]);

/**
 * Checks whether the value is a string, and if so, whether the identifier
 * is an allowed string method.
 */
export function stringMethodMemberCheck(
  value: ExpressionReturnType,
  ident: string | number,
): boolean {
  return (
    typeof value === 'string' &&
    typeof ident === 'string' &&
    stringMethods.has(ident)
  );
}

/**
 * Checks whether the value is a string, and if so, whether the identifer
 * can be used as a numeric index.
 */
export function stringIndexMemberCheck(
  value: ExpressionReturnType,
  ident: string | number,
): boolean {
  return (
    typeof value === 'string' &&
    typeof ident === 'number' &&
    Object.prototype.hasOwnProperty.call(value, ident)
  );
}
