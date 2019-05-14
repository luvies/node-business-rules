import { Rules } from '../src';

describe('Rules', () => {
  it('Math context exists', async () => {
    const rules = new Rules();
    rules.set('math', {
      expression: `Math.min([1, 2])`,
    });
    const results = await rules.eval();
    expect(results.results.get('math')).toBe(1);
  });

  it('Basic dependency', async () => {
    const rules = new Rules();
    rules.set('base', {
      expression: `Math.min([1, 2])`,
    });
    rules.set('answer', {
      expression: `rule('base') + rule('base')`,
    });
    const results = await rules.eval();
    expect(results.results.get('answer')).toBe(2);
  });

  it('Alias dependency', async () => {
    const rules = new Rules();

    rules.set('__base__', {
      expression: `Math.max([1, 2])`,
    });
    rules.set('answer', {
      expression: `rule('a') + rule('b')`,
    });
    rules.aliases.set('a', '__base__');
    rules.aliases.set('b', '__base__');

    const results = await rules.eval();
    expect(results.results.get('answer')).toBe(4);
  });

  it('Activated rule', async () => {
    const rules = new Rules();
    rules.set('utility', {
      expression: `[10]`,
    });
    rules.set('activated', {
      expression: `10 > 5`,
    });
    rules.set('deactivated', {
      expression: `5 > 10`,
    });

    const results = await rules.eval();
    expect(results.results.get('utility')).toEqual([10]);
    expect(results.results.get('activated')).toBe(true);
    expect(results.results.get('deactivated')).toBe(false);
    expect(results.activated).toEqual(['activated']);
  });

  it('Accepts custom context', async () => {
    const rules = new Rules({
      event: {
        rpm: 1000,
        fault: 'F1',
      },
    });
    rules.set('fault', {
      expression: `event.rpm < 500 || !!event.fault`,
    });
    const results = await rules.eval();
    expect(results.results.get('fault')).toBe(true);
    expect(results.activated).toEqual(['fault']);
  });

  it('Persistent state', async () => {
    let value = 0;
    const rules = new Rules({
      getValue: () => value++,
    });
    rules.set('ruleA', {
      expression: `getValue() === 1`,
    });
    const resultsA = await rules.eval();
    expect(resultsA.activated.length).toBe(0);
    expect(resultsA.deactivated.length).toBe(0);

    const resultsB = await rules.eval();
    expect(resultsB.activated.length).toBe(1);
    expect(resultsB.deactivated.length).toBe(0);

    const resultsC = await rules.eval();
    expect(resultsC.activated.length).toBe(0);
    expect(resultsC.deactivated.length).toBe(1);
  });

  it('Context fetch', async () => {
    let temperature = 219;
    const rules = new Rules({
      latest: () => temperature++,
    });
    rules.set('ruleA', {
      expression: `latest('temperature') >= 220`,
    });
    const first = await rules.eval();
    expect(first.results.get('ruleA')).toBe(false);
    const second = await rules.eval();
    expect(second.results.get('ruleA')).toBe(true);
  });

  it('Method getter access sub-object', async () => {
    const rules = new Rules({
      sad: () => {
        return {
          range: {
            min: 0,
            max: 10,
          },
        };
      },
    });
    rules.set('rule', {
      expression: `sad().range.max`,
    });
    const results = await rules.eval();
    expect(results.results.get('rule')).toBe(10);
  });
});
