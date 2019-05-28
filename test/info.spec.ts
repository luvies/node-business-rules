import jsep from 'jsep';
import { inspect } from 'util';
import { ExpressionInfoCollector } from '../src';

describe('Info collector', () => {
  it('does something please god', () => {
    const info = new ExpressionInfoCollector({
      context: {
        a: '__a__',
        b: '__b__',
      },
    });

    console.log(
      inspect(
        info.collect(jsep('a + c.b(d(h(b.c)), a, b, [1,2, G(),3], "f")')),
        undefined,
        10,
      ),
    );

    console.log(inspect(info.collect(jsep('a["1"]()')), undefined, 10));
  });
});
