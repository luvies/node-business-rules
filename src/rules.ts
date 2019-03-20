import { Evaluator, ExpressionType, TypeMap } from './evaluator';

export interface Rule {
  expression: string;
  // A context specific to this rule.
  context?: TypeMap;
  // If set the callback will only be called if the result equals this.
  equals?: ExpressionType;
  callback: (result: ExpressionType) => void | Promise<void>;
}

export class Rules {
  private context?: TypeMap;
  private rules: Rule[] = [];

  public constructor(context?: TypeMap) {
    this.context = context;
  }

  public add(rule: Rule) {
    this.rules.push(rule);
  }

  public async eval() {
    await Promise.all(this.rules.map(rule => this.evalRule(rule)));
  }

  private async evalRule(rule: Rule): Promise<void> {
    const evaluator = new Evaluator({
      ...this.context,
      ...rule.context,
    });
    const result = await evaluator.eval(rule.expression);
    if (rule.callback && (!rule.equals || rule.equals === result)) {
      await rule.callback(result);
    }
  }
}
