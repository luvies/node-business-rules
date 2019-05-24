import jsep, { Expression } from 'jsep';
import { ExpressionEvaluator } from './expression-evaluator';
import { EvaluatorOptions, ExpressionResult } from './utils';

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
