interface Dependency {
  caller: string;
  target: string;
}

export class DependencyGraph {
  private dependencies: Dependency[] = [];

  public canCall(caller: string, target: string): boolean {
    // Now we need to check the reverse. So if the target has already called the caller.
    // First check direct, then go to recursive hell.
    const direct = this.dependencies.find(dep => {
      return dep.caller === target && dep.target === caller;
    });
    if (direct) {
      return false;
    }
    // Get each of the items that calls the caller.
    const indirects = this.dependencies.filter(dep => {
      return caller === dep.target;
    });
    for (const indirect of indirects) {
      if (!this.canCall(indirect.caller, target)) {
        return false;
      }
    }
    return true;
  }

  public addDependency(caller: string, target: string) {
    if (!this.canCall(caller, target)) {
      throw new Error('Circular dependency detected');
    }

    this.dependencies.push({
      caller,
      target,
    });
  }
}
