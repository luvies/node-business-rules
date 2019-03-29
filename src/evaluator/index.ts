import jsep, { Expression as BaseExpression } from 'jsep';
import { ExpressionError } from './expression-error';
import {
  ArrayType,
  EvaluatorOptions,
  ExpressionEvaluator,
  ExpressionResult,
  ExpressionReturnType,
  SimpleType,
  TypeMap,
} from './expression-evaluator';

export {
  ArrayType,
  EvaluatorOptions,
  ExpressionError,
  ExpressionEvaluator,
  ExpressionResult,
  ExpressionReturnType,
  SimpleType,
  TypeMap,
};

export class Evaluator {
  public constructor(public options: EvaluatorOptions) {}

  public async eval(expression: string): Promise<ExpressionResult> {
    const ast = jsep(expression);

    return this.evalExpression(ast);
  }

  public async evalExpression(
    expression: BaseExpression,
  ): Promise<ExpressionResult> {
    const expressionEvaluator = new ExpressionEvaluator(this.options);

    return expressionEvaluator.evalExpression(expression);
  }
}
