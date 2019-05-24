export interface TypeMap extends Record<string, ExpressionReturnType> {}

export type SimpleType = string | number | boolean;

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
}
