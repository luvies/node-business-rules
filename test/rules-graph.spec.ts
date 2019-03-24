import { DependencyGraph } from '../src/rules/dependency-graph';

describe('Dependency graph', () => {
  it('Basic A -> B', () => {
    const graph = new DependencyGraph(['a', 'b']);
    expect(graph.canCall('a', 'b')).toBe(true);
    expect(graph.canCall('b', 'a')).toBe(true);
    graph.addDependency('a', 'b');
    expect(graph.canCall('b', 'a')).toBe(false);
    expect(graph.canCall('a', 'b')).toBe(true);
    expect(graph.addDependency.bind(graph, 'b', 'a')).toThrow(
      'Circular dependency detected',
    );
  });

  it('Basic A -> B -> C', () => {
    const graph = new DependencyGraph(['a', 'b', 'c']);
    graph.addDependency('a', 'b');
    graph.addDependency('b', 'c');
    graph.addDependency('a', 'c');

    expect(() => graph.addDependency('b', 'a')).toThrow(
      'Circular dependency detected',
    );
    expect(() => graph.addDependency('c', 'a')).toThrow(
      'Circular dependency detected',
    );
  });

  it('Tree', () => {
    const graph = new DependencyGraph(['left', 'right', 'base', 'leaf']);
    graph.addDependency('left', 'base');
    graph.addDependency('right', 'base');
    graph.addDependency('leaf', 'left');
    graph.addDependency('leaf', 'right');

    expect(graph.canCall('lead', 'base')).toBe(true);
    expect(graph.canCall('lead', 'left')).toBe(true);
    expect(graph.canCall('lead', 'right')).toBe(true);

    expect(graph.canCall('left', 'right')).toBe(true);
    expect(graph.canCall('right', 'left')).toBe(true);

    graph.addDependency('left', 'right');

    expect(() => graph.addDependency('base', 'leaf')).toThrow(
      'Circular dependency detected',
    );

    graph.addDependency('leaf', 'base');
  });

  it('Call non-existent node', () => {
    const graph = new DependencyGraph(['a']);
    expect(() => graph.addDependency('a', 'b')).toThrow(
      'Target not found in list',
    );
  });
});
