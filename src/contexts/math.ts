import { TypeMap } from '../evaluator';

export const MathContext: TypeMap = {
  // Builtin Math functions.
  abs: Math.abs,
  acos: Math.acos,
  acosh: Math.acosh,
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atanh: Math.atanh,
  atan2: Math.atan2,
  cbrt: Math.cbrt,
  ceil: Math.ceil,
  clz32: Math.clz32,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  expm1: Math.expm1,
  floor: Math.floor,
  fround: Math.fround,
  hypot: (args: number[]) => Math.hypot(...args),
  imul: Math.imul,
  log: Math.log,
  log1p: Math.log1p,
  log10: Math.log10,
  log2: Math.log2,
  max: (args: number[]) => Math.max(...args),
  min: (args: number[]) => Math.min(...args),
  power: Math.pow,
  random: Math.random,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tanh,
  trunc: Math.trunc,
  // Extensions
  sum,
  avg,
};

function sum(args: number[]): number {
  return args.reduce((previousValue, currentValue) => {
    return currentValue + previousValue;
  }, 0);
}

function avg(args: number[]): number {
  return sum(args) / args.length;
}
