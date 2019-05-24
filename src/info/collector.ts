import {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Compound,
  ConditionalExpression,
  Expression,
  Identifier,
  LogicalExpression,
  MemberExpression,
  UnaryExpression,
} from 'jsep';
import {
  canAccessMember,
  EvaluatorOptions,
  ExpressionError,
  ExpressionReturnType,
  SimpleType,
} from '../evaluator';
import { ExpressionInfo } from './expression-info';
import { RuntimeValue } from './runtime-value';

export class ExpressionInfoCollector {
  public constructor(private readonly _options: EvaluatorOptions) {}

  public collect(expression: Expression): ExpressionInfo {
    switch (expression.type) {
      case 'ArrayExpression':
        return this.collectArrayExpression(expression);
      case 'BinaryExpression':
        return this.collectBinaryExpression(expression);
      case 'CallExpression':
        return this.collectCallExpression(expression);
      case 'Compound':
        return this.collectCompoundExpression(expression);
      case 'ConditionalExpression':
        return this.collectConditionalExpression(expression);
      case 'Identifier':
        return this.collectIdentifierExpression(expression);
      case 'Literal':
        return this.collectLiteralExpression();
      case 'LogicalExpression':
        return this.collectLogicalExpression(expression);
      case 'MemberExpression':
        return this.collectMemberExpression(expression);
      case 'ThisExpression':
        return this.collectThisExpression();
      case 'UnaryExpression':
        return this.collectUnaryExpression(expression);
    }
  }

  private collectArrayExpression(expression: ArrayExpression): ExpressionInfo {
    return ExpressionInfo.merge(
      expression.elements.map(element => this.collect(element)),
    );
  }

  private collectBinaryExpression(
    expression: BinaryExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collect(expression.left),
      this.collect(expression.right),
    ]);
  }

  private collectCallExpression(expression: CallExpression): ExpressionInfo {
    console.log(expression);
    throw new Error('Not implemented');
    // const [fn, args] = await Promise.all([
    //   this.collect(expression.callee),
    //   Promise.all(expression.arguments.map(argument => this.collect(argument))),
    // ]);

    // if (typeof fn.value === 'function') {
    //   return {
    //     value: await Promise.resolve(fn.value(...args.map(arg => arg.value))),
    //     nodes: 1 + args.reduce((prev, curr) => prev + curr.nodes, 0),
    //     functionCalls:
    //       1 + args.reduce((prev, curr) => prev + curr.functionCalls, 0),
    //   };
    // } else {
    //   throw new ExpressionError('Cannot call a non-function');
    // }
  }

  private collectCompoundExpression(expression: Compound): ExpressionInfo {
    if (expression.body.length > 0) {
      return ExpressionInfo.merge(
        expression.body.map(item => this.collect(item)),
      );
    } else {
      return ExpressionInfo.empty({
        errors: [new ExpressionError('Compound expression cannot be empty')],
      });
    }
  }

  private collectConditionalExpression(
    expression: ConditionalExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collect(expression.test),
      this.collect(expression.consequent),
      this.collect(expression.alternate),
    ]);
  }

  private collectIdentifierExpression(expression: Identifier): ExpressionInfo {
    const value = this._options.context[expression.name];

    if (value !== undefined) {
      return ExpressionInfo.empty();
    } else {
      return ExpressionInfo.empty({
        errors: [
          new ExpressionError(`Identifier (${expression.name}) not found`),
        ],
      });
    }
  }

  private collectLiteralExpression(): ExpressionInfo {
    return ExpressionInfo.empty();
  }

  private collectLogicalExpression(
    expression: LogicalExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collect(expression.left),
      this.collect(expression.right),
    ]);
  }

  private collectMemberExpression(
    expression: MemberExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collect(expression.object),
      expression.computed
        ? this.collect(expression.property)
        : ExpressionInfo.empty(),
    ]);
  }

  private collectThisExpression(): ExpressionInfo {
    return ExpressionInfo.empty();
  }

  private collectUnaryExpression(expression: UnaryExpression): ExpressionInfo {
    return this.collect(expression.argument);
  }

  private tryResolveIndexLiteral(
    expression: Expression,
  ): SimpleType | RuntimeValue {
    switch (expression.type) {
      case 'Literal':
        return expression.value;
      case 'MemberExpression':
        const contextValue = this.tryResolveFromContext(expression);

        if (
          typeof contextValue === 'string' ||
          typeof contextValue === 'number'
        ) {
          return contextValue;
        }
        break;
    }

    return new RuntimeValue();
  }

  private tryResolveFromContext(
    expression: MemberExpression,
  ): ExpressionReturnType | RuntimeValue {
    let index: SimpleType;
    if (expression.computed) {
      const comp = this.tryResolveIndexLiteral(expression.property);

      if (RuntimeValue.isRuntimeValue(comp)) {
        return comp;
      }

      index = comp;
    } else {
      index = expression.property.name;
    }

    switch (expression.object.type) {
      case 'MemberExpression':
        const ctx = this.tryResolveFromContext(expression.object);

        if (
          !RuntimeValue.isRuntimeValue(ctx) &&
          canAccessMember(this._options.memberChecks, ctx, index)
        ) {
          return ctx[index];
        }
        break;
      case 'Identifier':
        return this._options.context[index];
    }

    return new RuntimeValue();
  }
}
