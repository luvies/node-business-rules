import jsep, { Expression as BaseExpression } from 'jsep';
import { ExressionError } from './expression-error';
import {
  ArrayType,
  EvaluatorOptions,
  ExpressionEvaluator,
  ExpressionReturnType,
  SimpleType,
  TypeMap,
} from './expression-evaluator';

export { ArrayType, ExpressionReturnType, ExressionError, SimpleType, TypeMap };

export interface EvaluationResult {
  result: ExpressionReturnType;
  cost: number;
}

export class Evaluator {
  public constructor(private readonly _evalOptions: EvaluatorOptions) {}

  public async eval(expression: string): Promise<EvaluationResult> {
    const ast = jsep(expression);

    return this.evalExpression(ast);
  }

  public async evalExpression(
    expression: BaseExpression,
  ): Promise<EvaluationResult> {
    const expressionEvaluator = new ExpressionEvaluator(this._evalOptions);

    const result = await expressionEvaluator.evalExpression(expression);

    return {
      result,
      cost: expressionEvaluator.cost,
    };
  }
}
