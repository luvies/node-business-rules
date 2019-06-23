import { DependencyGraph } from './dependency-graph';
import {
  ExpressionEvaluator,
  ExpressionReturnType,
  MemberCheckFn,
  TypeMap,
  contexts,
  objectOwnPropertyMemberCheck,
  stringIndexMemberCheck,
  stringMethodMemberCheck,
} from '@luvies/evaluator';
import { ResultListener } from './result-listener';

export const standardMemberChecks: MemberCheckFn[] = [
  objectOwnPropertyMemberCheck,
  stringMethodMemberCheck,
  stringIndexMemberCheck,
];

export interface Rule {
  expression: string;
  // A context specific to this rule.
  context?: TypeMap;
}

export interface RuleResult {
  id: string;
  rule: Rule;
  value?: ExpressionReturnType;
  activated?: boolean;
  error?: Error;
}

export interface RuleResults {
  results: Map<string, ExpressionReturnType>;
  // Rules that have been activated since the last run.
  activated: string[];
  deactivated: string[];
  errors: Map<string, Error>;
}

export interface RulesOptions {
  previous?: Map<string, ExpressionReturnType>;
  aliases?: Map<string, string>;
}

export class Rules {
  public aliases: Map<string, string>;

  private _context: TypeMap;
  private _previous?: Map<string, ExpressionReturnType>;
  private _rules = new Map<string, Rule>();

  public constructor(context: TypeMap = {}, options: RulesOptions = {}) {
    this._context = context;
    this._previous = options.previous;
    this.aliases = options.aliases || new Map();
  }

  public set(id: string, rule: Rule): this {
    if (this.get(id)) {
      throw new Error(`Rule with id '${id}' already exists`);
    }
    this._rules.set(id, rule);

    return this;
  }

  public get(id: string): Rule | undefined {
    return this._rules.get(id);
  }

  public has(id: string): boolean {
    return this._rules.has(id);
  }

  public delete(id: string): boolean {
    return this._rules.delete(id);
  }

  public async eval(): Promise<RuleResults> {
    const graph = new DependencyGraph(Array.from(this._rules.keys()));
    const resultListener = new ResultListener<RuleResult>();

    const rawResults = await Promise.all(
      Array.from(this._rules).map(([id, rule]) => this._evalRule(id, rule, graph, resultListener)),
    );

    const results = new Map<string, ExpressionReturnType>();
    const activated: string[] = [];
    const deactivated: string[] = [];
    const errors = new Map<string, Error>();

    for (const rawResult of rawResults) {
      if (!rawResult.error) {
        results.set(rawResult.id, rawResult.value);
        const wasActivated = this._previous && this._previous.get(rawResult.id) === true;
        if (rawResult.activated) {
          if (!wasActivated) {
            activated.push(rawResult.id);
          }
        } else {
          if (wasActivated) {
            deactivated.push(rawResult.id);
          }
        }
      } else {
        errors.set(rawResult.id, rawResult.error);
      }
    }

    // Persist the state across runs so rules aren't constantly re-activated.
    this._previous = results;

    return {
      results,
      activated,
      deactivated,
      errors,
    };
  }

  private async _evalRule(
    id: string,
    rule: Rule,
    graph: DependencyGraph,
    resultListener: ResultListener<RuleResult>,
  ): Promise<RuleResult> {
    const evaluator = new ExpressionEvaluator({
      // Build up context using custom functions and various defaults.
      context: {
        rule: async (targetId: string) => {
          // Resolve aliases.
          if (this.aliases) {
            const alias = this.aliases.get(targetId);

            if (alias !== undefined) {
              targetId = alias;
            }
          }

          // First check if it will create a circular dependency.
          // This throws an error if it will otherwise stores it.
          graph.addDependency(id, targetId);
          const ruleResult = await resultListener.wait(targetId);
          return ruleResult.value;
        },
        ...contexts,
        ...this._context,
        ...rule.context,
      },
      // Load in standard member checks.
      memberChecks: standardMemberChecks,
    });

    const result: RuleResult = {
      id,
      rule,
    };

    try {
      const evaluatorResult = await evaluator.eval(rule.expression);
      result.value = evaluatorResult.value;

      // Specifically true so utility rules aren't activated.
      result.activated = result.value === true;
    } catch (err) {
      result.error = err;
    }

    resultListener.onResult(id, result);

    return result;
  }
}
