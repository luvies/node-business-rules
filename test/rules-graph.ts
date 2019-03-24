import { expect } from 'chai';

import { DependencyGraph } from '../src/rules/dependency-graph';

describe('Dependency graph', () => {
  it('Basic A -> B', () => {
    const graph = new DependencyGraph(['a', 'b']);
    expect(graph.canCall('a', 'b')).to.equal(true);
    expect(graph.canCall('b', 'a')).to.equal(true);
    graph.addDependency('a', 'b');
    expect(graph.canCall('b', 'a')).to.equal(false);
    expect(graph.canCall('a', 'b')).to.equal(true);
    expect(graph.addDependency.bind(graph, 'b', 'a')).to.throw(
      'Circular dependency detected',
    );
  });

  it('Basic A -> B -> C', () => {
    const graph = new DependencyGraph(['a', 'b', 'c']);
    graph.addDependency('a', 'b');
    graph.addDependency('b', 'c');
    graph.addDependency('a', 'c');

    expect(graph.addDependency.bind(graph, 'b', 'a')).to.throw(
      'Circular dependency detected',
    );
    expect(graph.addDependency.bind(graph, 'c', 'a')).to.throw(
      'Circular dependency detected',
    );
  });

  it('Tree', () => {
    const graph = new DependencyGraph(['left', 'right', 'base', 'leaf']);
    graph.addDependency('left', 'base');
    graph.addDependency('right', 'base');
    graph.addDependency('leaf', 'left');
    graph.addDependency('leaf', 'right');

    expect(graph.canCall('lead', 'base')).to.equal(true);
    expect(graph.canCall('lead', 'left')).to.equal(true);
    expect(graph.canCall('lead', 'right')).to.equal(true);

    expect(graph.canCall('left', 'right')).to.equal(true);
    expect(graph.canCall('right', 'left')).to.equal(true);

    graph.addDependency('left', 'right');

    expect(graph.addDependency.bind(graph, 'base', 'leaf')).to.throw(
      'Circular dependency detected',
    );

    graph.addDependency('leaf', 'base');
  });

  it('Call non-existent node', () => {
    const graph = new DependencyGraph(['a']);
    expect(graph.addDependency.bind(graph, 'a', 'b')).to.throw(
      'Target not found in list',
    );
  });
});
