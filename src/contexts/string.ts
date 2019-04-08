import { TypeMap } from '../evaluator';

export const StringContext: TypeMap = {
  regex,
};

function regex(pattern: string, flags?: string): RegExp {
  return new RegExp(pattern, flags);
}
