import { MathContext } from '../contexts/math';
import { Evaluator, ExpressionReturnType, TypeMap } from '../evaluator';
import { DependencyGraph } from './dependency-graph';
import { ResultListener } from './result-listener';

export interface Rule {
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
  deactivated: string[];
}

export class Rules {
  private context: TypeMap;
  private previous?: Map<string, ExpressionReturnType>;
  private rules = new Map<string, Rule>();

  public constructor(
    context: TypeMap = {},
    previous?: Map<string, ExpressionReturnType>,
  ) {
    this.context = context;
    this.previous = previous;
  }

  public set(id: string, rule: Rule) {
    if (this.get(id)) {
      throw new Error(`Rule with id '${id}' already exists`);
    }
    this.rules.set(id, rule);
  }

  public get(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  public has(id: string): boolean {
    return this.rules.has(id);
  }

  public delete(id: string): boolean {
    return this.rules.delete(id);
  }

  public async eval(): Promise<RuleResults> {
    const graph = new DependencyGraph(Array.from(this.rules.keys()));
    const resultListener = new ResultListener<RuleResult>();

    const rawResults = await Promise.all(
      Array.from(this.rules).map(([id, rule]) =>
        this.evalRule(id, rule, graph, resultListener),
      ),
    );

    const results = new Map<string, ExpressionReturnType>();
    const activated: string[] = [];
    for (const rawResult of rawResults) {
      results.set(rawResult.id, rawResult.value);
      if (rawResult.activated) {
        activated.push(rawResult.id);
      }
    }
    const deactivated: string[] = [];
    if (this.previous) {
      for (const id of this.previous.keys()) {
        if (this.previous.get(id) === true && results.get(id) !== true) {
          deactivated.push(id);
        }
      }
    }

    // Persist the state across runs so rules aren't constantly re-activated.
    this.previous = results;

    return {
      results,
      activated,
      deactivated,
    };
  }

  private async evalRule(
    id: string,
    rule: Rule,
    graph: DependencyGraph,
    resultListener: ResultListener<RuleResult>,
  ): Promise<RuleResult> {
    const context = {
      rule: async (targetId: string) => {
        // First check if it will create a circular dependency.
        // This throws an error if it will otherwise stores it.
        graph.addDependency(id, targetId);
        const ruleResult = await resultListener.wait(targetId);
        return ruleResult.value;
      },
      Math: MathContext,
      ...this.context,
      ...rule.context,
    };
    const evaluator = new Evaluator({ context });
    const evaluatorResult = await evaluator.eval(rule.expression);
    const value = evaluatorResult.value;

    // Specifically true so utility rules aren't activated.
    const wasActivated = this.previous && this.previous.get(id) === true;
    const isActivated = value === true;

    const result = {
      id,
      value,
      rule,
      activated: isActivated && !wasActivated,
    };

    resultListener.onResult(id, result);

    return result;
  }
}
