import jsep, { Expression } from 'jsep';
import { EvaluatorOptions, ExpressionResult } from './eval-types';
import { ExpressionEvaluator } from './expression-evaluator';

export * from './eval-types';
export * from './expression-error';
export * from './expression-evaluator';
export * from './member-checks';
export * from './utils';

export class Evaluator {
  public constructor(public options: EvaluatorOptions) {}

  public async eval(expression: string): Promise<ExpressionResult> {
    const ast = jsep(expression);

    return this.evalExpression(ast);
  }

  public async evalExpression(
    expression: Expression,
  ): Promise<ExpressionResult> {
    const expressionEvaluator = new ExpressionEvaluator(this.options);

    return expressionEvaluator.evalExpression(expression);
  }
}
