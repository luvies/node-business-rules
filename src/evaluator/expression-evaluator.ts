import {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Compound,
  ConditionalExpression,
  Expression as BaseExpression,
  Identifier,
  Literal,
  LogicalExpression,
  MemberExpression,
  ThisExpression,
  UnaryExpression,
} from 'jsep';
import { ExpressionError } from './expression-error';

type Expression =
  | ArrayExpression
  | BinaryExpression
  | CallExpression
  | Compound
  | ConditionalExpression
  | Identifier
  | Literal
  | LogicalExpression
  | MemberExpression
  | ThisExpression
  | UnaryExpression;

export interface TypeMap extends Record<string, ExpressionReturnType> {}

export type SimpleType = string | number | boolean;

export type FunctionType = (
  ...args: any[]
) => ExpressionReturnType | Promise<ExpressionReturnType>;

export interface ArrayType extends Array<ExpressionReturnType> {}

export type ExpressionReturnType =
  | SimpleType
  | ArrayType
  | FunctionType
  | TypeMap;

export interface ExpressionResult<T = ExpressionReturnType> {
  value: T;
  nodes: number;
  functionCalls: number;
}

export interface EvaluatorOptions {
  /**
   * The context of the expression.
   */
  context: TypeMap;
}

export class ExpressionEvaluator {
  private readonly _context: TypeMap;

  public constructor(options: EvaluatorOptions) {
    this._context = options.context;
  }

  public async evalExpression(
    baseExpression: BaseExpression,
  ): Promise<ExpressionResult> {
    const expression: Expression = baseExpression as any;

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
          `Expression type ${baseExpression.type} is invalid`,
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
      case '<':
      case '>':
      case '<=':
      case '>=':
      case '+':
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
            case '+':
              value = left.value + right.value;
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
      test ? expression.consequent : expression.alternate,
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
      expression.property.type === 'Identifier'
        ? {
            value: (expression.property as Identifier).name,
            nodes: 1,
            functionCalls: 0,
          }
        : this.evalExpression(expression.property),
    ]);

    if (
      typeof property.value !== 'string' &&
      typeof property.value !== 'number'
    ) {
      throw new ExpressionError(`Cannot index with type ${typeof property}`);
    }

    if (typeof value.value === 'object') {
      if (value.value.hasOwnProperty(property.value)) {
        return {
          value: (value.value as any)[property.value],
          nodes: 1 + value.nodes + property.nodes,
          functionCalls: value.functionCalls + property.functionCalls,
        };
      } else {
        throw new ExpressionError(`Value does not have property ${property}`);
      }
    } else {
      throw new ExpressionError(`Cannot index type ${typeof value}`);
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
              value = result.value;
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
