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
});
