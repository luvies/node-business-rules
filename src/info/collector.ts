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
import { FunctionCall } from './function-call';
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

  //////////// Collection methods ////////////

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
    const errors: ExpressionError[] = [];
    const fn = this.tryResolveCallExpression(expression, errors);
    const args = expression.arguments.map(arg => this.collect(arg));

    return ExpressionInfo.merge(
      fn instanceof FunctionCall
        ? [
            ExpressionInfo.empty({
              functionCalls: [fn],
              errors,
            }),
            ...args,
          ]
        : args,
    );
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

  //////////// Resolution methods ////////////

  private tryResolveCallExpression(
    expression: CallExpression,
    errors?: ExpressionError[],
  ): FunctionCall | RuntimeValue {
    const path = this.tryResolveCallIdent(expression.callee);

    if (path.length === 0) {
      return new RuntimeValue();
    }

    const name = path.pop();

    if (typeof name !== 'string') {
      return new RuntimeValue();
    }

    const args: Array<ExpressionReturnType | FunctionCall | RuntimeValue> = [];
    for (const arg of expression.arguments) {
      args.push(this.tryResolveLiteral(arg, errors));
    }

    return new FunctionCall(name, args, path);
  }

  private tryResolveCallIdent(
    expression: Expression,
  ): [RuntimeValue, ...SimpleType[]] | SimpleType[] {
    switch (expression.type) {
      case 'Identifier':
        return [expression.name];
      case 'MemberExpression':
        const subIdent = this.tryResolveCallIdent(expression.object);

        let currIdent: RuntimeValue | SimpleType;
        if (expression.computed) {
          currIdent = this.tryResolveIndexLiteral(expression.property);
        } else {
          currIdent = expression.property.name;
        }

        return [...subIdent, currIdent] as
          | [RuntimeValue, ...SimpleType[]]
          | SimpleType[];
      default:
        return [new RuntimeValue()];
    }
  }

  private tryResolveIndexLiteral(
    expression: Expression,
  ): SimpleType | RuntimeValue {
    const lit = this.tryResolveLiteral(expression);

    if (
      typeof lit === 'string' ||
      typeof lit === 'number' ||
      typeof lit === 'boolean'
    ) {
      return lit;
    }

    return new RuntimeValue();
  }

  private tryResolveLiteral(
    expression: Expression,
    errors?: ExpressionError[],
  ): ExpressionReturnType | FunctionCall | RuntimeValue {
    switch (expression.type) {
      case 'Literal':
        return expression.value;
      case 'Identifier':
        return this._options.context[expression.name];
      case 'MemberExpression':
        return this.tryResolveFromContext(expression, errors);
      case 'ArrayExpression':
        return this.tryResolveArrayLiteral(expression, errors);
      case 'CallExpression':
        return this.tryResolveCallExpression(expression, errors);
    }

    return new RuntimeValue();
  }

  private tryResolveFromContext(
    expression: MemberExpression,
    errors?: ExpressionError[],
  ): ExpressionReturnType | FunctionCall | RuntimeValue {
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

    if (typeof index !== 'undefined' && index !== null) {
      let ctx: ExpressionReturnType | FunctionCall | RuntimeValue;
      let gotCtx = false;

      switch (expression.object.type) {
        case 'MemberExpression':
          ctx = this.tryResolveFromContext(expression.object, errors);
          gotCtx = true;
          break;
        case 'Identifier':
          ctx = this._options.context;
          gotCtx = true;
          break;
      }

      if (
        gotCtx &&
        !RuntimeValue.isRuntimeValue(ctx) &&
        typeof ctx !== 'undefined' &&
        ctx !== null &&
        canAccessMember(this._options.memberChecks, ctx, index)
      ) {
        return ctx[index];
      } else if (errors) {
        errors.push(
          new ExpressionError(
            `Cannot not allowed to index ${ctx} (type: ${typeof ctx}) with ${index} (type: ${typeof index})`,
          ),
        );
      }
    }

    return new RuntimeValue();
  }

  private tryResolveArrayLiteral(
    expression: ArrayExpression,
    errors?: ExpressionError[],
  ): Array<ExpressionReturnType | FunctionCall> | RuntimeValue {
    const values: ExpressionReturnType[] = [];
    for (const item of expression.elements) {
      const value = this.tryResolveLiteral(item, errors);

      if (value instanceof RuntimeValue) {
        return value;
      } else {
        values.push(value);
      }
    }

    return values;
  }
}
