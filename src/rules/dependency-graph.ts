interface Dependency {
  source: string;
  target: string;
}

export class DependencyGraph {
  private dependencies: Dependency[] = [];
  private nodes: string[];

  public constructor(nodes: string[]) {
    this.nodes = nodes;
  }

  public canCall(source: string, target: string): boolean {
    // Now we need to check the reverse. So if the target has already called the source.
    // First check direct, then go to recursive hell.
    const direct = this.dependencies.find(dep => {
      return dep.source === target && dep.target === source;
    });
    if (direct) {
      return false;
    }
    // Get each of the items that calls the source.
    const indirects = this.dependencies.filter(dep => {
      return source === dep.target;
    });
    for (const indirect of indirects) {
      if (!this.canCall(indirect.source, target)) {
        return false;
      }
    }
    return true;
  }

  public addDependency(source: string, target: string) {
    if (!this.nodes.includes(source)) {
      throw new Error('Source not found in list');
    }
    if (!this.nodes.includes(target)) {
      throw new Error('Target not found in list');
    }
    if (!this.canCall(source, target)) {
      throw new Error('Circular dependency detected');
    }

    this.dependencies.push({
      source,
      target,
    });
  }
}
