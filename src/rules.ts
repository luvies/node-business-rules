import { Evaluator, ExpressionReturnType, TypeMap } from './evaluator';

export interface Rule {
  id: string;
  expression: string;
  // A context specific to this rule.
  context?: TypeMap;
  // If set the callback will only be called if the result equals this.
  equals?: ExpressionReturnType;
}

export interface RuleResult {
  id: string;
  result: ExpressionReturnType;
  rule: Rule;
  activated: boolean;
}

export interface RuleResults {
  results: Map<string, ExpressionReturnType>;
  // Rules that have been activated since the last run.
  activated: string[];
}

export class Rules {
  private context?: TypeMap;
  private previous?: Map<string, ExpressionReturnType>;
  private rules: Rule[] = [];

  public constructor(
    context?: TypeMap,
    previous?: Map<string, ExpressionReturnType>,
  ) {
    this.context = context;
    this.previous = previous;
  }

  public add(rule: Rule) {
    if (this.get(rule.id)) {
      throw new Error(`Rule with id (${rule.id}) already exists`);
    }
    this.rules.push(rule);
  }

  public get(id: string): Rule | undefined {
    return this.rules.find(rule => rule.id === id);
  }

  public async eval(): Promise<RuleResults> {
    const rawResults = await Promise.all(
      this.rules.map(rule => this.evalRule(rule)),
    );

    const results = new Map<string, ExpressionReturnType>();
    const activated: string[] = [];
    for (const rawResult of rawResults) {
      results.set(rawResult.id, rawResult.result);
      if (rawResult.activated) {
        activated.push(rawResult.id);
      }
    }

    // Persist the state across runs so rules aren't constantly re-activated.
    this.previous = results;

    return {
      results,
      activated,
    };
  }

  private async evalRule(rule: Rule): Promise<RuleResult> {
    const evaluator = new Evaluator({
      context: {
        ...this.context,
        ...rule.context,
      },
    });
    const { result } = await evaluator.eval(rule.expression);
    const wasActivated =
      this.previous && this.previous.get(rule.id) === rule.equals;
    const isActivated = rule.equals === result;

    return {
      id: rule.id,
      result,
      rule,
      activated: isActivated && !wasActivated,
    };
  }
}
