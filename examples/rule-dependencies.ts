import { Rules } from '../src';

async function main() {
  const rules = new Rules();

  rules.set('utilityA', {
    expression: `1000 * 1000`,
  });
  rules.set('func', {
    expression: `rule('utilityA') * rule('utilityA')`,
  });

  const results = await rules.eval();
  console.log('All rule results', results.results);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
