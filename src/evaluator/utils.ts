export interface TypeMap extends Record<string, ExpressionReturnType> {}

export type SimpleType = string | number | boolean | undefined | null;

export type FunctionType = (
  ...args: any[]
) => ExpressionReturnType | Promise<ExpressionReturnType>;

export interface ArrayType extends Array<ExpressionReturnType> {}

export type ExpressionReturnType =
  | SimpleType
  | ArrayType
  | FunctionType
  | TypeMap
  | object;

export interface ExpressionResult<T = ExpressionReturnType> {
  value: T;
  nodes: number;
  functionCalls: number;
}

export type MemberCheckFn = (
  value: ExpressionReturnType,
  ident: string | number,
) => boolean;

export interface EvaluatorOptions {
  /**
   * The context of the expression.
   */
  context: TypeMap;
  /**
   * An iterable of functions that check whether the given identifier can be used to
   * index the given value.
   * If any of these return true, then the indexing operation is allowed.
   */
  memberChecks?: Iterable<MemberCheckFn>;
  /**
   * A formatting function to use when creating error messages from values.
   * Defaults to `String`.
   */
  valueFormatter?: (value: any) => string;
}

export function canAccessMember(
  memberChecks: Iterable<MemberCheckFn> | undefined,
  value: ExpressionReturnType,
  ident: string | number,
): boolean {
  if (memberChecks) {
    for (const memberCheckFn of memberChecks) {
      if (memberCheckFn(value, ident)) {
        return true;
      }
    }
  }

  return false;
}
