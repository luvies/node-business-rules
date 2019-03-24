import { Rules } from '../rules';

async function main() {
  const rules = new Rules();

  rules.add({
    id: 'utilityA',
    expression: `1000 * 1000`,
  });
  rules.add({
    id: 'func',
    expression: `rule('utilityA') * rule('utilityA')`,
  });

  const results = await rules.eval();
  console.log('All rule results', results.results);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
