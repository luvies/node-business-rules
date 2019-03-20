import jsep, { Expression as BaseExpression } from 'jsep';
import {
  ArrayType,
  EvaluatorOptions,
  ExpressionEvaluator,
  ExpressionType,
  SimpleType,
  TypeMap,
} from './expression-evaluator';
import { InvalidExressionError } from './invalid-expression-error';

export {
  ArrayType,
  ExpressionType,
  InvalidExressionError,
  SimpleType,
  TypeMap,
};

export interface EvaluationResult {
  result: ExpressionType;
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
