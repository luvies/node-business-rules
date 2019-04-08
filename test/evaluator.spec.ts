import {
  Evaluator,
  ExpressionReturnType,
  objectOwnPropertyMemberCheck,
  stringIndexMemberCheck,
  stringMethodMemberCheck,
} from '../src';
import { MathContext, StringContext } from '../src/contexts';
import { ConvertContext } from '../src/contexts/convert';

let evaluator: Evaluator;

async function evl(expr: string): Promise<ExpressionReturnType> {
  const result = await evaluator.eval(expr);
  return result.value;
}

beforeEach(() => {
  evaluator = new Evaluator({
    context: {},
  });
});

describe('Evaluator', () => {
  it('evaluates literals', async () => {
    await expect(evl('1')).resolves.toBe(1);
    await expect(evl('2')).resolves.toBe(2);
    await expect(evl('3')).resolves.toBe(3);
    await expect(evl('4')).resolves.toBe(4);

    await expect(evl(`'a'`)).resolves.toBe('a');
    await expect(evl(`'b'`)).resolves.toBe('b');
    await expect(evl(`'c'`)).resolves.toBe('c');
    await expect(evl(`'d'`)).resolves.toBe('d');

    await expect(evl('[1, 2, 3]')).resolves.toEqual([1, 2, 3]);
    await expect(evl('[2, 3, 1]')).resolves.toEqual([2, 3, 1]);
    await expect(evl('[3, 2, 1]')).resolves.toEqual([3, 2, 1]);
    await expect(evl('[9, 8, 7, 5]')).resolves.toEqual([9, 8, 7, 5]);
  });

  it('evaluates basic expressions', async () => {
    await expect(evl('1 + 2')).resolves.toBe(1 + 2);
    await expect(evl('2 + 4')).resolves.toBe(2 + 4);
    await expect(evl('5 + 6')).resolves.toBe(5 + 6);
    await expect(evl('7 + 8')).resolves.toBe(7 + 8);

    await expect(evl('1 * 2')).resolves.toBe(1 * 2);
    await expect(evl('2 * 4')).resolves.toBe(2 * 4);
    await expect(evl('5 * 6')).resolves.toBe(5 * 6);
    await expect(evl('7 * 8')).resolves.toBe(7 * 8);

    await expect(evl('1 - 2')).resolves.toBe(1 - 2);
    await expect(evl('2 - 4')).resolves.toBe(2 - 4);
    await expect(evl('5 - 6')).resolves.toBe(5 - 6);
    await expect(evl('7 - 8')).resolves.toBe(7 - 8);

    await expect(evl('1 / 2')).resolves.toBeCloseTo(1 / 2);
    await expect(evl('2 / 4')).resolves.toBeCloseTo(2 / 4);
    await expect(evl('5 / 6')).resolves.toBeCloseTo(5 / 6);
    await expect(evl('7 / 8')).resolves.toBeCloseTo(7 / 8);

    await expect(evl('true ? 1 : 0')).resolves.toBe(1);
    await expect(evl('false ? 1 : 0')).resolves.toBe(0);

    await expect(evl('1, 2')).resolves.toBe(2);
    await expect(evl('1, 2, 3')).resolves.toBe(3);
    await expect(evl('1, 2, 3, 4')).resolves.toBe(4);
  });

  it('evaluates identifiers', async () => {
    evaluator.options.context = {
      a: 'a',
      b: 'b',
      c: 1,
      d: 2,
    };

    await expect(evl('a + b')).resolves.toBe('ab');
    await expect(evl('c + d')).resolves.toBe(3);
  });
});

describe('Evaluator member checks', () => {
  beforeEach(() => {
    evaluator.options.context = {
      l: (v: any) => v,
      a: {
        b: () => 'c',
      },
    };
  });

  it('handles no member checks', async () => {
    await expect(evl('a.b()')).rejects.toThrow();
    await expect(evl('l("abc")[0]')).rejects.toThrow();
    await expect(evl('l(" a ").trim()')).rejects.toThrow();
  });

  it('handles object member checks', async () => {
    evaluator.options.memberChecks = [objectOwnPropertyMemberCheck];

    await expect(evl('a.b()')).resolves.toBe('c');
    await expect(evl('l("abc")[0]')).rejects.toThrow();
    await expect(evl('l(" a ").trim()')).rejects.toThrow();
  });

  it('handles string member checks', async () => {
    evaluator.options.memberChecks = [stringIndexMemberCheck];

    await expect(evl('a.b()')).rejects.toThrow();
    await expect(evl('l("abc")[0]')).resolves.toBe('a');
    await expect(evl('l(" a ").trim()')).rejects.toThrow();
  });

  it('handles string method member checks', async () => {
    evaluator.options.memberChecks = [stringMethodMemberCheck];

    await expect(evl('a.b()')).rejects.toThrow();
    await expect(evl('l("abc")[0]')).rejects.toThrow();
    await expect(evl('l(" a ").trim()')).resolves.toBe('a');
  });
});

describe('Evaluator contexts', () => {
  beforeEach(() => {
    evaluator.options.memberChecks = [objectOwnPropertyMemberCheck];
  });

  it('has a correct math context', async () => {
    evaluator.options.context = {
      Math: MathContext,
    };

    await expect(evl('Math.abs(-1)')).resolves.toBe(1);
  });

  it('has a correct string context', async () => {
    evaluator.options.context = {
      String: StringContext,
    };

    await expect(evl('String.regex("abc")')).resolves.toEqual(/abc/);
    await expect(evl('String.regex("abc", "g")')).resolves.toEqual(/abc/g);
  });

  it('has a correct convert context', async () => {
    evaluator.options.context = {
      Convert: ConvertContext,
    };

    await expect(evl('Convert.toString(1)')).resolves.toBe('1');
    await expect(evl('Convert.toNumber("1")')).resolves.toBe(1);
    await expect(evl('Convert.toNumber("a")')).resolves.toBeNaN();
  });
});
