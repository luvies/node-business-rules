import { Rules } from '../rules';

// This function would be replaced with one to connect to your database
// and fetch a variable of a given name and timeframe. In this example
// a dummy dataset is used.
async function window(name: string, timeframe: string): Promise<number[]> {
  switch (name) {
    case 'vibration':
      switch (timeframe) {
        case '1m':
          return [10];
        case '3m':
          return [10, 11.2, 11.3];
        default:
          throw new Error('Timeframe not defined');
      }
      break;
    case 'speed':
      switch (timeframe) {
        case '1m':
          return [4000];
        case '3m':
          return [4000, 3000, 2000];
        default:
          throw new Error('Timeframe not defined');
      }
      break;
    default:
      throw new Error('Variable name not defined');
  }
}

async function main() {
  const context = {
    min(list: number[]): number {
      return Math.min(...list);
    },
    max(list: number[]): number {
      return Math.max(...list);
    },
    window,
  };

  // These rules would be run each time telemetry is received in your system.
  // Setting equals below means the rule will only be called if the result matches.
  const rules = new Rules(context);
  rules.add({
    id: 'ruleA',
    expression: `min(window('speed', '3m')) < 3000 && max(window('vibration', '3m')) > 10`,
    equals: true,
  });
  rules.add({
    id: 'ruleB',
    expression: `min(window('speed', '1m')) < 3000 && max(window('vibration', '1m')) > 10`,
    equals: true,
  });

  console.log('Run 1');
  const resultsA = await rules.eval();
  console.log('All rule results', resultsA.results);
  console.log('Rules activated', resultsA.activated);

  // Running this twice shows that the rule was already activated in the first run
  // and so isn't marked as activated in the second run. This can work across
  // sessions by storing resultsA.results and missing it back into the constructor.
  console.log('Run 2');
  const resultsB = await rules.eval();
  console.log('All rule results', resultsB.results);
  console.log('Rules activated', resultsB.activated);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
