import { Evaluator } from './evaluator';

async function main() {
  const context = {
    a: 1,
    b: 2,
    c: 'c',
    sum(a: number, b: number): number {
      return a + b;
    },
    root: {
      fn() {
        return Promise.resolve('b');
      },
    },
  };

  const evaluator = new Evaluator({ context });

  console.log(await evaluator.eval(`sum(a, b) + c + root.fn()`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
