export class DependencyGraph {
  // Source -> {Targets}
  private _dependencies = new Map<string, Set<string>>();
  private _nodes: string[];

  public constructor(nodes: string[]) {
    this._nodes = nodes;
  }

  public canCall(source: string, target: string): boolean {
    // Now we need to check the reverse. So if the target has already called the source.
    // First check direct, then go to recursive hell.
    const targetCalls = this._dependencies.get(target);

    if (!targetCalls) {
      return true;
    }

    if (targetCalls.has(source)) {
      return false;
    }

    for (const targetCall of targetCalls) {
      if (!this.canCall(source, targetCall)) {
        return false;
      }
    }

    return true;
  }

  public addDependency(source: string, target: string): void {
    if (!this._nodes.includes(source)) {
      throw new Error('Source not found in list');
    }
    if (!this._nodes.includes(target)) {
      throw new Error('Target not found in list');
    }
    if (!this.canCall(source, target)) {
      throw new Error('Circular dependency detected');
    }

    const calls = this._dependencies.get(source);

    if (calls) {
      calls.add(target);
    } else {
      this._dependencies.set(source, new Set([target]));
    }
  }
}
