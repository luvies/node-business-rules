import { ExpressionError } from '../evaluator';
import { FunctionCall } from './function-call';

export class ExpressionInfo {
  public static merge(infos: ExpressionInfo[]): ExpressionInfo {
    return new ExpressionInfo(
      infos.reduce<FunctionCall[]>(
        (prev, curr) => prev.concat(curr.functionCalls),
        [],
      ),
      infos.reduce<ExpressionError[]>(
        (prev, curr) => prev.concat(curr.errors),
        [],
      ),
    );
  }

  public static empty(diff: Partial<ExpressionInfo> = {}): ExpressionInfo {
    return new ExpressionInfo(
      diff.functionCalls ? diff.functionCalls : [],
      diff.errors ? diff.errors : [],
    );
  }

  private constructor(
    /**
     * An array of every single function call used in the expression, ignoring nesting.
     * If the name of a function call is computed in any way, then it is excluded from
     * this list.
     */
    public readonly functionCalls: readonly FunctionCall[],
    /**
     * An array of all the errors generated during the info collection.
     */
    public readonly errors: readonly ExpressionError[],
  ) {}
}
