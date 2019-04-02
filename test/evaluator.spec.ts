import { Evaluator, ExpressionReturnType } from '../src';

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
    expect(await evl('1')).toBe(1);
    expect(await evl('2')).toBe(2);
    expect(await evl('3')).toBe(3);
    expect(await evl('4')).toBe(4);

    expect(await evl(`'a'`)).toBe('a');
    expect(await evl(`'b'`)).toBe('b');
    expect(await evl(`'c'`)).toBe('c');
    expect(await evl(`'d'`)).toBe('d');

    expect(await evl('[1, 2, 3]')).toEqual([1, 2, 3]);
    expect(await evl('[2, 3, 1]')).toEqual([2, 3, 1]);
    expect(await evl('[3, 2, 1]')).toEqual([3, 2, 1]);
    expect(await evl('[9, 8, 7, 5]')).toEqual([9, 8, 7, 5]);
  });

  it('evaluates basic expressions', async () => {
    expect(await evl('1 + 2')).toBe(1 + 2);
    expect(await evl('2 + 4')).toBe(2 + 4);
    expect(await evl('5 + 6')).toBe(5 + 6);
    expect(await evl('7 + 8')).toBe(7 + 8);

    expect(await evl('1 * 2')).toBe(1 * 2);
    expect(await evl('2 * 4')).toBe(2 * 4);
    expect(await evl('5 * 6')).toBe(5 * 6);
    expect(await evl('7 * 8')).toBe(7 * 8);

    expect(await evl('1 - 2')).toBe(1 - 2);
    expect(await evl('2 - 4')).toBe(2 - 4);
    expect(await evl('5 - 6')).toBe(5 - 6);
    expect(await evl('7 - 8')).toBe(7 - 8);

    expect(await evl('1 / 2')).toBeCloseTo(1 / 2);
    expect(await evl('2 / 4')).toBeCloseTo(2 / 4);
    expect(await evl('5 / 6')).toBeCloseTo(5 / 6);
    expect(await evl('7 / 8')).toBeCloseTo(7 / 8);

    expect(await evl('true ? 1 : 0')).toBe(1);
    expect(await evl('false ? 1 : 0')).toBe(0);

    expect(await evl('1, 2')).toBe(2);
    expect(await evl('1, 2, 3')).toBe(3);
    expect(await evl('1, 2, 3, 4')).toBe(4);
  });

  it('evaluates identifiers', async () => {
    evaluator.options.context = {
      a: 'a',
      b: 'b',
      c: 1,
      d: 2,
    };

    expect(await evl('a + b')).toBe('ab');
    expect(await evl('c + d')).toBe(3);
  });
});
