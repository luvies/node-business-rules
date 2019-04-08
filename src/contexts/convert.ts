import { TypeMap } from '../evaluator';

export const ConvertContext: TypeMap = {
  toString,
  toNumber,
};

function toString(value: any): string {
  return String(value);
}

function toNumber(value: any): number {
  return Number(value);
}
