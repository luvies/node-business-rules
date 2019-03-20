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
import { ExressionError } from './expression-error';

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

export type ArrayType = string[] | number[] | boolean[];

export type ExpressionReturnType =
  | SimpleType
  | ArrayType
  | ((...args: any[]) => ExpressionReturnType | Promise<ExpressionReturnType>)
  | TypeMap;

export interface EvaluatorOptions {
  /**
   * The context of the expression.
   */
  context: TypeMap;
  /**
   * The maxmimum cost that the expression is allowed.
   * If it tries to go beyond it, then an exception is thrown during
   * execution.
   */
  maxCost?: number;
}

export class ExpressionEvaluator {
  public cost = 0;

  private readonly _context: TypeMap;

  public constructor(options: EvaluatorOptions) {
    this._context = options.context;
  }

  public async evalExpression(
    baseExpression: BaseExpression,
  ): Promise<ExpressionReturnType> {
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
    }
  }

  private async evalArrayExpression(
    expression: ArrayExpression,
  ): Promise<ArrayType> {
    if (expression.elements.length === 0) {
      return [];
    } else {
      const type = typeof expression.elements[0];

      if (type !== 'string' && type !== 'number' && type !== 'boolean') {
        throw new ExressionError(
          'Array can only be of type string, number or boolean',
        );
      }

      return expression.elements.map(baseElement => {
        const element: Expression = baseElement as any;
        let value: string | number | boolean;
        switch (element.type) {
          case 'Identifier':
            const identValue = this.evalIdentifierExpression(element);
            if (
              typeof identValue === 'string' ||
              typeof identValue === 'number' ||
              typeof identValue === 'boolean'
            ) {
              value = identValue;
            } else {
              throw new ExressionError(
                'Array can only be of type string, number or boolean',
              );
            }
            break;
          case 'Literal':
            value = this.evalLiteralExpression(element);
            break;
          default:
            throw new ExressionError(
              'Array can only contain identifiers and literals',
            );
        }

        if (typeof value !== type) {
          throw new ExressionError(
            'Array can only contain items of the same type',
          );
        } else {
          return value as any;
        }
      });
    }
  }

  private async evalBinaryExpression(
    expression: BinaryExpression,
  ): Promise<SimpleType> {
    const [left, right] = await Promise.all([
      this.evalExpression(expression.left),
      this.evalExpression(expression.right),
    ]);

    switch (expression.operator) {
      case '|':
      case '^':
      case '&':
      case '<<':
      case '>>':
      case '>>>':
      case '%':
        if (
          // Use explicit typeofs for type correctness.
          (typeof left === 'number' || typeof left === 'bigint') &&
          (typeof right === 'number' || typeof right === 'bigint')
        ) {
          switch (expression.operator) {
            case '|':
              return left | right;
            case '^':
              return left ^ right;
            case '&':
              return left & right;
            case '<<':
              return left << right;
            case '>>':
              return left >> right;
            case '>>>':
              return left >>> right;
            case '%':
              return left % right;
          }
        } else {
          throw new ExressionError(
            'Cannot perform bitwise operation on non-number',
          );
        }
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '<=':
        return left <= right;
      case '>=':
        return left >= right;
      case '+':
      case '-':
      case '*':
      case '/':
        // Could do more explicit checks to force same or numeric types
        if (
          (typeof left === 'string' || typeof left === 'number') &&
          (typeof right === 'string' || typeof right === 'number')
        ) {
          switch (expression.operator) {
            case '+':
              return (left as any) + (right as any);
            case '-':
              return (left as any) - (right as any);
            case '*':
              return (left as any) * (right as any);
            case '/':
              return (left as any) / (right as any);
          }
        } else {
          throw new ExressionError(
            `Cannot perform arithmetic operation on ${typeof left} as ${typeof right}`,
          );
        }
      default:
        throw new ExressionError(`Operator ${expression.operator} is unknown`);
    }
  }

  private async evalCallExpression(
    expression: CallExpression,
  ): Promise<ExpressionReturnType> {
    const [fn, args] = await Promise.all([
      this.evalExpression(expression.callee),
      Promise.all(
        expression.arguments.map(argument => this.evalExpression(argument)),
      ),
    ]);

    if (typeof fn === 'function') {
      return fn(...args);
    } else {
      throw new ExressionError('Cannot call a non-function');
    }
  }

  private async evalCompoundExpression(
    expression: Compound,
  ): Promise<ExpressionReturnType> {
    let result: ExpressionReturnType | undefined;

    for (const item of expression.body) {
      result = await this.evalExpression(item);
    }

    if (result !== undefined) {
      return result;
    } else {
      throw new ExressionError('Compound expression cannot be empty');
    }
  }

  private async evalConditionalExpression(
    expression: ConditionalExpression,
  ): Promise<ExpressionReturnType> {
    const [test, consequent, alternate] = await Promise.all([
      this.evalExpression(expression.test),
      this.evalExpression(expression.consequent),
      this.evalExpression(expression.alternate),
    ]);

    return test ? consequent : alternate;
  }

  private evalIdentifierExpression(
    expression: Identifier,
  ): ExpressionReturnType {
    const value = this._context[expression.name];

    if (value !== undefined) {
      return value;
    } else {
      throw new ExressionError(`Indentifier ${expression.name} not found`);
    }
  }

  private evalLiteralExpression(expression: Literal): SimpleType {
    return expression.value;
  }

  private async evalLogicalExpression(
    expression: LogicalExpression,
  ): Promise<ExpressionReturnType> {
    const [left, right] = await Promise.all([
      this.evalExpression(expression.left),
      this.evalExpression(expression.right),
    ]);

    switch (expression.operator) {
      case '||':
        return left || right;
      case '&&':
        return left && right;
      default:
        throw new ExressionError(
          `Logical operator ${expression.operator} is invalid`,
        );
    }
  }

  private async evalMemberExpression(
    expression: MemberExpression,
  ): Promise<ExpressionReturnType> {
    const [value, property] = await Promise.all([
      this.evalExpression(expression.object),
      expression.property.type === 'Identifier'
        ? (expression.property as Identifier).name
        : this.evalExpression(expression.property),
    ]);

    if (typeof property !== 'string' && typeof property !== 'number') {
      throw new ExressionError(`Cannot index with type ${typeof property}`);
    }

    if (typeof value === 'object') {
      if (value.hasOwnProperty(property)) {
        return (value as any)[property];
      } else {
        throw new ExressionError(`Value does not have property ${property}`);
      }
    } else {
      throw new ExressionError(`Cannot index type ${typeof value}`);
    }
  }

  private evalThisExpression(): TypeMap {
    return this._context;
  }

  private async evalUnaryExpression(
    expression: UnaryExpression,
  ): Promise<number | boolean> {
    const value = await this.evalExpression(expression.argument);

    switch (expression.operator) {
      case '-':
        return -value;
      case '!':
        return !value;
      case '~':
        return ~value;
      case '+':
        return +value;
      default:
        throw new ExressionError(
          `Unary operator ${expression.operator} is invalid`,
        );
    }
  }
}
