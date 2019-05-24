import { ExpressionReturnType, MemberCheckFn } from './eval-types';

export function canAccessMember(
  memberChecks: Iterable<MemberCheckFn> | undefined,
  value: ExpressionReturnType,
  ident: string | number,
): boolean {
  if (memberChecks) {
    for (const memberCheckFn of memberChecks) {
      if (memberCheckFn(value, ident)) {
        return true;
      }
    }
  }

  return false;
}
