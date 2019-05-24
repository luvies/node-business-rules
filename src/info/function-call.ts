import { SimpleType } from '../evaluator';
import { RuntimeValue } from './runtime-value';

export interface LiteralArray extends Array<LiteralType> {}

export type LiteralType = string | number | boolean | LiteralArray;

export class FunctionCall {
  public static isFunctionCall(obj: unknown): obj is FunctionCall {
    return obj instanceof FunctionCall;
  }

  public constructor(
    /**
     * The resolved name of the function.
     */
    public name: string,
    /**
     * The arguments of the function.
     * All function calls in this are for reference only, as the main
     * function call array will contain every single found function.
     */
    public args: Array<LiteralType | FunctionCall | RuntimeValue>,
    /**
     * The resolved path of the function. If the function is being used at
     * root-level, then this will be an empty array.
     * This will attempt to go as far as possible until it is no longer
     * feasible to statically read the path.
     * @example
     * `value()` -> `[]`
     * `Math.min()` -> `['Math']`
     * `a[b || c].d()` -> `[RuntimeValue, 'd']`
     */
    public path: [RuntimeValue, ...SimpleType[]] | SimpleType[],
  ) {}
}
