import {
  ContextArgs,
  FunctionAnalysisConfig,
  TypeMap,
  contextFunctionAnalysisConfig,
  contexts,
} from '@luvies/evaluator';

interface RuleArgs {
  rule: [string];
}

const ruleFunctionAnalysisConfig: FunctionAnalysisConfig<RuleArgs> = {
  rule: { args: ['string'] },
};

export type FullRuleContextArgs = RuleArgs & ContextArgs;

export const fullRuleContextArgs: FunctionAnalysisConfig<FullRuleContextArgs> = {
  ...ruleFunctionAnalysisConfig,
  ...contextFunctionAnalysisConfig,
};

export const mockContext: TypeMap = {
  ...contexts,
  rule: () => undefined,
};
