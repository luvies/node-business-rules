import {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Compound,
  ConditionalExpression,
  Expression,
  Identifier,
  Literal,
  LogicalExpression,
  MemberExpression,
  UnaryExpression,
} from 'jsep';
import { ExpressionError } from './expression-error';
import {
  ArrayType,
  EvaluatorOptions,
  ExpressionResult,
  ExpressionReturnType,
  MemberCheckFn,
  SimpleType,
  TypeMap,
} from './utils';
import { canAccessMember } from './utils';

export class ExpressionEvaluator {
  private readonly _context: TypeMap;
  private readonly _memberChecks?: Iterable<MemberCheckFn>;

  public constructor(options: EvaluatorOptions) {
    this._context = options.context;
    this._memberChecks = options.memberChecks;
  }

  public async evalExpression(
    expression: Expression,
  ): Promise<ExpressionResult> {
    switch (expression.type) {
      case 'ArrayExpression':
        return this.evalArrayExpression(expression);
      case 'BinaryExpression':
        return this.evalBinaryExpression(expression);
      case 'CallExpression':
        return this.evalCallExpression(expression);
      case 'Compound':
        return this.evalCompoundExpression(expression);
      case 'ConditionalExpression':
        return this.evalConditionalExpression(expression);
      case 'Identifier':
        return this.evalIdentifierExpression(expression);
      case 'Literal':
        return this.evalLiteralExpression(expression);
      case 'LogicalExpression':
        return this.evalLogicalExpression(expression);
      case 'MemberExpression':
        return this.evalMemberExpression(expression);
      case 'ThisExpression':
        return this.evalThisExpression();
      case 'UnaryExpression':
        return this.evalUnaryExpression(expression);
      default:
        throw new ExpressionError(
          `Expression type ${(expression as any).type} is invalid`,
        );
    }
  }

  private async evalArrayExpression(
    expression: ArrayExpression,
  ): Promise<ExpressionResult<ArrayType>> {
    const result = {
      value: [] as ArrayType,
      nodes: 1,
      functionCalls: 0,
    };

    if (expression.elements.length === 0) {
      return result;
    } else {
      const elements = await Promise.all(
        expression.elements.map(element => this.evalExpression(element)),
      );

      for (const element of elements) {
        result.value.push(element.value);
        result.nodes += element.nodes;
        result.functionCalls += element.functionCalls;
      }

      return result;
    }
  }

  private async evalBinaryExpression(
    expression: BinaryExpression,
  ): Promise<ExpressionResult<SimpleType>> {
    const [left, right] = await Promise.all([
      this.evalExpression(expression.left),
      this.evalExpression(expression.right),
    ]);

    let value: SimpleType;

    switch (expression.operator) {
      case '+':
        if (
          // Use explicit typeofs for type correctness.
          ((typeof left.value === 'number' || typeof left.value === 'bigint') &&
            (typeof right.value === 'number' ||
              typeof right.value === 'bigint')) ||
          (typeof left.value === 'string' && typeof right.value === 'string')
        ) {
          value = (left.value as any) + (right.value as any);
        } else {
          throw new ExpressionError(
            'Operator + can only be applied to 2 numbers or 2 strings',
          );
        }
        break;
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '-':
      case '*':
      case '/':
      case '|':
      case '^':
      case '&':
      case '<<':
      case '>>':
      case '>>>':
      case '%':
        if (
          // Use explicit typeofs for type correctness.
          (typeof left.value === 'number' || typeof left.value === 'bigint') &&
          (typeof right.value === 'number' || typeof right.value === 'bigint')
        ) {
          switch (expression.operator) {
            case '<':
              value = left.value < right.value;
              break;
            case '>':
              value = left.value > right.value;
              break;
            case '<=':
              value = left.value <= right.value;
              break;
            case '>=':
              value = left.value >= right.value;
              break;
            case '-':
              value = left.value - right.value;
              break;
            case '*':
              value = left.value * right.value;
              break;
            case '/':
              value = left.value / right.value;
              break;
            case '|':
              value = left.value | right.value;
              break;
            case '^':
              value = left.value ^ right.value;
              break;
            case '&':
              value = left.value & right.value;
              break;
            case '<<':
              value = left.value << right.value;
              break;
            case '>>':
              value = left.value >> right.value;
              break;
            case '>>>':
              value = left.value >>> right.value;
              break;
            case '%':
              value = left.value % right.value;
              break;
            default:
              // We should never get here.
              throw new ExpressionError('???');
          }
        } else {
          throw new ExpressionError(
            `Cannot perform operation ${expression.operator} on non-number`,
          );
        }
        break;
      case '==':
      case '===':
        value = left.value === right.value;
        break;
      case '!=':
      case '!==':
        value = left.value !== right.value;
        break;
      default:
        throw new ExpressionError(`Operator ${expression.operator} is unknown`);
    }

    return {
      value,
      nodes: 1 + left.nodes + right.nodes,
      functionCalls: left.functionCalls + right.functionCalls,
    };
  }

  private async evalCallExpression(
    expression: CallExpression,
  ): Promise<ExpressionResult> {
    const [fn, args] = await Promise.all([
      this.evalExpression(expression.callee),
      Promise.all(
        expression.arguments.map(argument => this.evalExpression(argument)),
      ),
    ]);

    if (typeof fn.value === 'function') {
      return {
        value: await Promise.resolve(fn.value(...args.map(arg => arg.value))),
        nodes: 1 + args.reduce((prev, curr) => prev + curr.nodes, 0),
        functionCalls:
          1 + args.reduce((prev, curr) => prev + curr.functionCalls, 0),
      };
    } else {
      throw new ExpressionError('Cannot call a non-function');
    }
  }

  private async evalCompoundExpression(
    expression: Compound,
  ): Promise<ExpressionResult> {
    let result: ExpressionResult | undefined;

    for (const item of expression.body) {
      result = await this.evalExpression(item);
    }

    if (result !== undefined) {
      result.nodes += expression.body.length;
      return result;
    } else {
      throw new ExpressionError('Compound expression cannot be empty');
    }
  }

  private async evalConditionalExpression(
    expression: ConditionalExpression,
  ): Promise<ExpressionResult> {
    const test = await this.evalExpression(expression.test);
    const result = await this.evalExpression(
      test.value ? expression.consequent : expression.alternate,
    );

    return {
      value: result.value,
      nodes: 1 + test.nodes + result.nodes,
      functionCalls: test.functionCalls + result.functionCalls,
    };
  }

  private evalIdentifierExpression(expression: Identifier): ExpressionResult {
    const value = this._context[expression.name];

    if (value !== undefined) {
      return {
        value,
        nodes: 1,
        functionCalls: 0,
      };
    } else {
      throw new ExpressionError(`Identifier (${expression.name}) not found`);
    }
  }

  private evalLiteralExpression(
    expression: Literal,
  ): ExpressionResult<SimpleType> {
    return {
      value: expression.value,
      nodes: 1,
      functionCalls: 0,
    };
  }

  private async evalLogicalExpression(
    expression: LogicalExpression,
  ): Promise<ExpressionResult> {
    const left = await this.evalExpression(expression.left);
    let right: ExpressionResult | undefined;
    let value: ExpressionReturnType;

    switch (expression.operator) {
      case '||':
        if (left.value) {
          value = left.value;
        } else {
          right = await this.evalExpression(expression.right);
          value = right.value;
        }
        break;
      case '&&':
        if (!left.value) {
          value = left.value;
        } else {
          right = await this.evalExpression(expression.right);
          value = right.value;
        }
        break;
      default:
        throw new ExpressionError(
          `Logical operator ${expression.operator} is invalid`,
        );
    }

    return {
      value,
      nodes: 1 + left.nodes + (right ? right.nodes : 0),
      functionCalls: left.functionCalls + (right ? right.functionCalls : 0),
    };
  }

  private async evalMemberExpression(
    expression: MemberExpression,
  ): Promise<ExpressionResult> {
    const [value, property] = await Promise.all([
      this.evalExpression(expression.object),
      expression.computed
        ? this.evalExpression(expression.property)
        : {
            value: expression.property.name,
            nodes: 1,
            functionCalls: 0,
          },
    ]);

    if (typeof value.value === 'undefined' || value.value === null) {
      throw new ExpressionError(
        `Cannot index ${
          typeof value.value === 'undefined' ? 'undefined' : 'null'
        }`,
      );
    }

    if (
      typeof property.value !== 'string' &&
      typeof property.value !== 'number'
    ) {
      throw new ExpressionError(`Cannot index with type ${typeof property}`);
    }

    if (canAccessMember(this._memberChecks, value.value, property.value)) {
      let val = (value.value as any)[property.value];

      // If the resolved value is a function, we need to bind it
      // to the object in order to preserve the 'this' reference.
      if (typeof val === 'function') {
        val = val.bind(value.value);
      }

      return {
        value: val,
        nodes: 1 + value.nodes + property.nodes,
        functionCalls: value.functionCalls + property.functionCalls,
      };
    } else {
      throw new ExpressionError(
        `Not allowed to index ${
          value.value
        } (type: ${typeof value.value}) with ${
          property.value
        } (type: ${typeof property.value})`,
      );
    }
  }

  private evalThisExpression(): ExpressionResult<TypeMap> {
    return {
      value: this._context,
      nodes: 0, // Doing `this.` doesn't actually add anything to complexity.
      functionCalls: 0,
    };
  }

  private async evalUnaryExpression(
    expression: UnaryExpression,
  ): Promise<ExpressionResult<number | boolean>> {
    const result = await this.evalExpression(expression.argument);
    let value: number | boolean;

    switch (expression.operator) {
      case '-':
      case '~':
      case '+':
        if (
          typeof result.value === 'number' ||
          typeof result.value === 'bigint'
        ) {
          switch (expression.operator) {
            case '-':
              value = -result.value;
              break;
            case '~':
              value = ~result.value;
              break;
            case '+':
              value = +result.value;
              break;
            default:
              // We should never get here.
              throw new ExpressionError('???');
          }
        } else {
          throw new ExpressionError(
            `Cannot perform ${expression.operator} on non-number`,
          );
        }
        break;
      case '!':
        value = !result.value;
        break;
      default:
        throw new ExpressionError(
          `Unary operator ${expression.operator} is invalid`,
        );
    }

    return {
      value,
      nodes: 1 + result.nodes,
      functionCalls: result.functionCalls,
    };
  }
}
