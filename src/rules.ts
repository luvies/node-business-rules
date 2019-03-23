import { Evaluator, ExpressionReturnType, TypeMap } from './evaluator';

export interface Rule {
  id: string;
  expression: string;
  // A context specific to this rule.
  context?: TypeMap;
  // If set allows the rule to be marked as activated.
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

interface Dependency {
  caller: string;
  target: string;
}

interface ResultListenerItem {
  resolve: (result: RuleResult) => void;
  target: string;
}

class ResultListener {
  private results = new Map<string, RuleResult>();
  private listeners: ResultListenerItem[] = [];

  public onResult(result: RuleResult) {
    const listeners = this.listeners.filter(listener => {
      return listener.target === result.id;
    });
    for (const listener of listeners) {
      listener.resolve(result);
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    }
    this.results.set(result.id, result);
  }

  public async wait(rule: string): Promise<RuleResult> {
    if (this.results.has(rule)) {
      return this.results.get(rule)!;
    }
    return new Promise(resolve => {
      this.listeners.push({
        resolve,
        target: rule,
      });
    });
  }
}

export class Rules {
  private context?: TypeMap;
  private previous?: Map<string, ExpressionReturnType>;
  // Map of caller rule ID to target rule ID.
  private dependencyMap: Dependency[] = [];
  private resultListener = new ResultListener();
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
    this.dependencyMap = [];
    this.resultListener = new ResultListener();

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

  private checkDependency(caller: string, target: string) {
    // Now we need to check the reverse. So if the target has already called the caller.
    // First check direct, then go to recursive hell.
    const direct = this.dependencyMap.find(dep => {
      return dep.caller === target && dep.target === caller;
    });
    if (direct) {
      throw new Error(
        `Circular rule dependency found from ${caller} to ${target}`,
      );
    }
    // Get each of the items that calls the caller.
    const indirects = this.dependencyMap.filter(dep => {
      return caller === dep.target;
    });
    for (const indirect of indirects) {
      this.checkDependency(indirect.caller, target);
    }
    this.dependencyMap.push({
      caller,
      target,
    });
  }

  private async evalRule(rule: Rule): Promise<RuleResult> {
    const context = {
      rule: async (id: string) => {
        // First check if it will create a circular dependency.
        this.checkDependency(rule.id, id);
        return (await this.resultListener.wait(id)).result;
      },
      ...this.context,
      ...rule.context,
    };
    const evaluator = new Evaluator({ context });
    const { result } = await evaluator.eval(rule.expression);
    const wasActivated =
      this.previous && this.previous.get(rule.id) === rule.equals;
    const isActivated = rule.equals === result;

    const returnValue = {
      id: rule.id,
      result,
      rule,
      activated: rule.equals !== undefined && isActivated && !wasActivated,
    };

    this.resultListener.onResult(returnValue);

    return returnValue;
  }
}
