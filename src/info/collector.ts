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
import jsep from 'jsep';
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
  private readonly _options?: EvaluatorOptions;
  private readonly _valueFormatter: (value: any) => string;

  private _visited = new WeakSet<Expression>();

  public constructor({
    evalOpts,
    valueFormatter,
  }: {
    evalOpts?: EvaluatorOptions;
    /**
     * Used to override the formatter in the eval opts, or to provide
     * a formatter without any eval opts.
     * Defaults to `String`.
     */
    valueFormatter?: (value: any) => string;
  } = {}) {
    this._options = evalOpts;
    this._valueFormatter =
      valueFormatter || (evalOpts && evalOpts.valueFormatter) || String;
  }

  public collect(expression: Expression | string): ExpressionInfo {
    this._visited = new WeakSet();

    return this.collectExpression(
      typeof expression === 'string' ? jsep(expression) : expression,
    );
  }

  //////////// Collection methods ////////////

  private collectExpression(expression: Expression): ExpressionInfo {
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
      expression.elements.map(element => this.collectExpression(element)),
    );
  }

  private collectBinaryExpression(
    expression: BinaryExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collectExpression(expression.left),
      this.collectExpression(expression.right),
    ]);
  }

  private collectCallExpression(expression: CallExpression): ExpressionInfo {
    const fn = this.tryResolveCallExpression(expression);
    const callee = this.collectExpression(expression.callee);
    const args = expression.arguments.map(arg => this.collectExpression(arg));

    return ExpressionInfo.merge(
      fn instanceof FunctionCall
        ? [
            ExpressionInfo.empty({
              functionCalls: [fn],
            }),
            callee,
            ...args,
          ]
        : [callee, ...args],
    );
  }

  private collectCompoundExpression(expression: Compound): ExpressionInfo {
    if (expression.body.length > 0) {
      return ExpressionInfo.merge(
        expression.body.map(item => this.collectExpression(item)),
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
      this.collectExpression(expression.test),
      this.collectExpression(expression.consequent),
      this.collectExpression(expression.alternate),
    ]);
  }

  private collectIdentifierExpression(expression: Identifier): ExpressionInfo {
    if (this._options) {
      const errors: ExpressionError[] = [];
      this.tryResolveFromIdentifier(expression, errors);

      return ExpressionInfo.empty({
        errors,
      });
    } else {
      return ExpressionInfo.empty();
    }
  }

  private collectLiteralExpression(): ExpressionInfo {
    return ExpressionInfo.empty();
  }

  private collectLogicalExpression(
    expression: LogicalExpression,
  ): ExpressionInfo {
    return ExpressionInfo.merge([
      this.collectExpression(expression.left),
      this.collectExpression(expression.right),
    ]);
  }

  private collectMemberExpression(
    expression: MemberExpression,
  ): ExpressionInfo {
    // Resolve the errors for the member chain.
    // The result doesn't matter, only the error resolution here.
    const errors: ExpressionError[] = [];
    this.tryResolveFromMember(expression, errors);

    return ExpressionInfo.merge([
      ExpressionInfo.empty({
        errors,
      }),
      this.collectExpression(expression.object),
      expression.computed
        ? this.collectExpression(expression.property)
        : ExpressionInfo.empty(),
    ]);
  }

  private collectThisExpression(): ExpressionInfo {
    return ExpressionInfo.empty();
  }

  private collectUnaryExpression(expression: UnaryExpression): ExpressionInfo {
    return this.collectExpression(expression.argument);
  }

  //////////// Resolution methods ////////////

  private tryResolveCallExpression(
    expression: CallExpression,
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
      args.push(this.tryResolveLiteral(arg));
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
        let currIdent: RuntimeValue | SimpleType;
        if (expression.computed) {
          currIdent = this.tryResolveIndexLiteral(expression.property);
        } else {
          currIdent = expression.property.name;
        }

        if (currIdent instanceof RuntimeValue) {
          return [currIdent];
        }

        const subIdent = this.tryResolveCallIdent(expression.object);

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
        return this.tryResolveFromIdentifier(expression, errors);
      case 'MemberExpression':
        return this.tryResolveFromMember(expression, errors);
      case 'ArrayExpression':
        return this.tryResolveArrayLiteral(expression);
      case 'CallExpression':
        return this.tryResolveCallExpression(expression);
    }

    return new RuntimeValue();
  }

  private tryResolveFromIdentifier(
    expression: Identifier,
    errors?: ExpressionError[],
  ): ExpressionReturnType | RuntimeValue {
    if (this._options) {
      if (
        Object.prototype.hasOwnProperty.call(
          this._options.context,
          expression.name,
        )
      ) {
        return this._options.context[expression.name];
      } else {
        this.tryAddError(
          expression,
          errors,
          new ExpressionError(
            `Identifier (${this._valueFormatter(expression.name)}) not found`,
          ),
        );
      }
    }

    return new RuntimeValue();
  }

  private tryResolveFromMember(
    expression: MemberExpression,
    errors?: ExpressionError[],
  ): ExpressionReturnType | FunctionCall | RuntimeValue {
    if (this._options) {
      let index: SimpleType;

      if (expression.computed) {
        const comp = this.tryResolveIndexLiteral(expression.property);

        if (comp instanceof RuntimeValue) {
          return comp;
        }

        index = comp;
      } else {
        index = expression.property.name;
      }

      if (typeof index !== 'string' && typeof index !== 'number') {
        this.tryAddError(
          expression,
          errors,
          new ExpressionError(`Cannot index with type ${typeof index}`),
        );
      } else {
        let ctx: ExpressionReturnType | RuntimeValue;
        let gotCtx = false;

        switch (expression.object.type) {
          case 'MemberExpression':
            ctx = this.tryResolveFromMember(expression.object, errors);
            gotCtx = true;
            break;
          case 'Identifier':
            ctx = this.tryResolveFromIdentifier(expression.object);
            gotCtx = true;
            break;
        }

        if (ctx instanceof RuntimeValue) {
          return ctx;
        } else if (gotCtx) {
          if (!this._options) {
            return (ctx as any)[index];
          } else if (canAccessMember(this._options.memberChecks, ctx, index)) {
            return (ctx as any)[index];
          } else {
            this.tryAddError(
              expression,
              errors,
              new ExpressionError(
                `Not allowed to index ${this._valueFormatter(
                  ctx,
                )} (type: ${typeof ctx}) with ${this._valueFormatter(
                  index,
                )} (type: ${typeof index})`,
              ),
            );
          }
        }
      }
    }

    return new RuntimeValue();
  }

  private tryResolveArrayLiteral(
    expression: ArrayExpression,
  ): Array<ExpressionReturnType | FunctionCall> | RuntimeValue {
    const values: ExpressionReturnType[] = [];
    for (const item of expression.elements) {
      const value = this.tryResolveLiteral(item);

      if (value instanceof RuntimeValue) {
        return value;
      } else {
        values.push(value);
      }
    }

    return values;
  }

  private tryAddError(
    expression: Expression,
    errors: ExpressionError[] | undefined,
    error: ExpressionError,
  ) {
    if (errors) {
      if (!this._visited.has(expression)) {
        errors.push(error);
        this._visited.add(expression);
      }
    }
  }
}
