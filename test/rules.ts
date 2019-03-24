import { expect } from 'chai';

import { Rules } from '../src/rules';

describe('Rules', () => {
  it('Math context exists', async () => {
    const rules = new Rules();
    rules.add({
      id: 'math',
      expression: `Math.min([1, 2])`,
    });
    const results = await rules.eval();
    expect(results.results.get('math')).to.equal(1);
  });

  it('Basic dependency', async () => {
    const rules = new Rules();
    rules.add({
      id: 'base',
      expression: `Math.min([1, 2])`,
    });
    rules.add({
      id: 'answer',
      expression: `rule('base') + rule('base')`,
    });
    const results = await rules.eval();
    expect(results.results.get('answer')).to.equal(2);
  });

  it('Activated rule', async () => {
    const rules = new Rules();
    rules.add({
      id: 'utility',
      expression: `[10]`,
    });
    rules.add({
      id: 'activated',
      expression: `10 > 5`,
    });
    rules.add({
      id: 'deactivated',
      expression: `5 > 10`,
    });

    const results = await rules.eval();
    expect(results.results.get('utility')).to.deep.equal([10]);
    expect(results.results.get('activated')).to.equal(true);
    expect(results.results.get('deactivated')).to.equal(false);
    expect(results.activated).to.deep.equal(['activated']);
  });

  it('Accepts custom context', async () => {
    const rules = new Rules({
      event: {
        rpm: 1000,
        fault: 'F1',
      },
    });
    rules.add({
      id: 'fault',
      expression: `event.rpm < 500 || !!event.fault`,
    });
    const results = await rules.eval();
    expect(results.results.get('fault')).to.equal(true);
    expect(results.activated).to.deep.equal(['fault']);
  });

  it('Persistent state', async () => {
    let value = 0;
    const rules = new Rules({
      getValue: () => value++,
    });
    rules.add({
      id: 'ruleA',
      expression: `getValue() > 0`,
    });
    const resultsA = await rules.eval();
    expect(resultsA.activated.length).to.equal(0);

    const resultsB = await rules.eval();
    expect(resultsB.activated.length).to.equal(1);

    const resultsC = await rules.eval();
    expect(resultsC.activated.length).to.equal(0);
  });
});
