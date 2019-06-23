import { ExpressionAnalyzer, FunctionAnalyzer, standardMemberChecks } from '@luvies/evaluator';
import { fullRuleContextArgs, mockContext } from '../src';

describe('Rules Analysis', () => {
  it('correctly analyses rule calls', () => {
    const analyzer = new ExpressionAnalyzer({
      evalOpts: {
        context: {
          ...mockContext,
          a: 'a',
          b: 'b',
        },
        memberChecks: standardMemberChecks,
      },
    });

    const fnAnalyzer = new FunctionAnalyzer(fullRuleContextArgs);

    let analysis = analyzer.analyze('a + b');
    let fnAnalysis = fnAnalyzer.analyze(analysis);

    expect(fnAnalysis.rule).toStrictEqual({
      invalid: [],
      valid: [],
    });

    analysis = analyzer.analyze('rule("a")');
    fnAnalysis = fnAnalyzer.analyze(analysis);

    expect(fnAnalysis.rule).toStrictEqual({
      invalid: [],
      valid: [['a']],
    });

    analysis = analyzer.analyze('rule(1)');
    fnAnalysis = fnAnalyzer.analyze(analysis);

    expect(fnAnalysis.rule).toStrictEqual({
      invalid: [[1]],
      valid: [],
    });

    analysis = analyzer.analyze('rule("a", "b"), rule("c", 2), rule(true), rule("d", false)');
    fnAnalysis = fnAnalyzer.analyze(analysis);

    expect(fnAnalysis.rule).toStrictEqual({
      invalid: [[true]],
      valid: [['a', 'b'], ['c', 2], ['d', false]],
    });
  });
});
