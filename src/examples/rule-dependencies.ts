import { Rules } from '../rules';

// This method demonstrates basic rule dependencies.
async function basic() {
  const rules = new Rules({});

  rules.add({
    id: 'utilityA',
    expression: `1000 * 1000`,
  });
  rules.add({
    id: 'utilityB',
    expression: `rule('utilityA') * rule('utilityA')`,
  });

  const results = await rules.eval();
  console.log('All rule results', results.results);
}

async function circular() {
  const rules = new Rules({});

  rules.add({
    id: 'utilityA',
    expression: `rule('utilityC') * 100`,
  });
  rules.add({
    id: 'utilityB',
    expression: `rule('utilityA') * 100`,
  });
  rules.add({
    id: 'utilityC',
    expression: `rule('utilityB') * 100`,
  });

  const results = await rules.eval();
  console.log('All rule results', results.results);
}

async function tree() {
  const rules = new Rules({});

  rules.add({
    id: 'base',
    expression: `1000`,
  });
  rules.add({
    id: 'treeA',
    expression: `rule('base') * 10`,
  });
  rules.add({
    id: 'treeB',
    expression: `rule('base') * 20`,
  });
  rules.add({
    id: 'leaf',
    expression: `rule('treeA') + rule('treeB')`,
  });

  const results = await rules.eval();
  console.log('All rule results', results.results);
}

async function main() {
  await basic();
  await tree();
  try {
    await circular();
    throw new Error('Circular dependencies should not work');
  } catch (err) {
    console.log('Circular dependency failed as expected');
  }
  console.log('Exit');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
