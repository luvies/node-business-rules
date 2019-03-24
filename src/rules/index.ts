import { MathContext } from '../contexts/math';
import { Evaluator, ExpressionReturnType, TypeMap } from '../evaluator';
import { DependencyGraph } from './dependency-graph';
import { ResultListener } from './result-listener';

export interface Rule {
  id: string;
  expression: string;
  // A context specific to this rule.
  context?: TypeMap;
}

export interface RuleResult {
  id: string;
  value: ExpressionReturnType;
  rule: Rule;
  activated: boolean;
}

export interface RuleResults {
  results: Map<string, ExpressionReturnType>;
  // Rules that have been activated since the last run.
  activated: string[];
}

export class Rules {
  private context: TypeMap;
  private previous?: Map<string, ExpressionReturnType>;
  private graph = new DependencyGraph([]);
  private resultListener = new ResultListener<RuleResult>();
  private rules: Rule[] = [];

  public constructor(
    context?: TypeMap,
    previous?: Map<string, ExpressionReturnType>,
  ) {
    this.context = context || {};
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
    this.graph = new DependencyGraph(this.rules.map(rule => rule.id));
    this.resultListener = new ResultListener<RuleResult>();

    const rawResults = await Promise.all(
      this.rules.map(rule => this.evalRule(rule)),
    );

    const results = new Map<string, ExpressionReturnType>();
    const activated: string[] = [];
    for (const rawResult of rawResults) {
      results.set(rawResult.id, rawResult.value);
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
    const context = {
      rule: async (id: string) => {
        // First check if it will create a circular dependency.
        // This throws an error if it will otherwise stores it.
        this.graph.addDependency(rule.id, id);
        const ruleResult = await this.resultListener.wait(id);
        return ruleResult.value;
      },
      Math: MathContext,
      ...this.context,
      ...rule.context,
    };
    const evaluator = new Evaluator({ context });
    const evaluatorResult = await evaluator.eval(rule.expression);
    const value = evaluatorResult.result;

    // Specifically true so utility rules aren't activated.
    const wasActivated = this.previous && this.previous.get(rule.id) === true;
    const isActivated = value === true;

    const result = {
      id: rule.id,
      value,
      rule,
      activated: isActivated && !wasActivated,
    };

    this.resultListener.onResult(rule.id, result);

    return result;
  }
}
