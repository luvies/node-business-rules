import jsep, {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Compound,
  ConditionalExpression,
  Identifier,
  Literal,
  LogicalExpression,
  MemberExpression,
  ThisExpression,
  UnaryExpression,
} from 'jsep';
import { InvalidExressionError } from './invalid-expression-error';

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

export interface TypeMap extends Record<string, ExpressionType> {}

type SimpleType = string | number | boolean;

type ArrayType = string[] | number[] | boolean[];

export type ExpressionType =
  | SimpleType
  | ArrayType
  | ((...args: any[]) => ExpressionType | Promise<ExpressionType>)
  | TypeMap;

export class Evaluator {
  public constructor(private readonly _context: TypeMap) {}

  public async eval(expression: string): Promise<ExpressionType> {
    const ast = jsep(expression);

    return this.evalExpression(ast as Expression);
  }

  private async evalExpression(
    expression: Expression,
  ): Promise<ExpressionType> {
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
        throw new InvalidExressionError(
          'Array can only be of type string, number or boolean',
        );
      }

      return expression.elements.map(element => {
        let value: string | number | boolean;
        switch (element.type) {
          case 'Identifier':
            const identValue = this.evalIdentifierExpression(element as any);
            const identType = typeof identValue;
            if (
              identType !== 'string' &&
              identType !== 'number' &&
              identType !== 'boolean'
            ) {
              throw new InvalidExressionError(
                'Array can only be of type string, number or boolean',
              );
            }
            value = identValue as any;
            break;
          case 'Literal':
            value = this.evalLiteralExpression(element as any);
            break;
          default:
            throw new InvalidExressionError(
              'Array can only contain identifiers and literals',
            );
        }

        if (typeof value !== type) {
          throw new InvalidExressionError(
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
      this.evalExpression(expression.left as Expression),
      this.evalExpression(expression.right as Expression),
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
          throw new InvalidExressionError(
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
        if (typeof left !== 'object' && typeof right !== 'object') {
          switch (expression.operator) {
            case '+':
              return left + (right as any);
            case '-':
              return (left as any) - (right as any);
            case '*':
              return (left as any) * (right as any);
            case '/':
              return (left as any) / (right as any);
          }
        } else {
          throw new InvalidExressionError(
            `Cannot perform arithmetic operation on ${typeof left} as ${typeof right}`,
          );
        }
      default:
        throw new InvalidExressionError(
          `Operator ${expression.operator} is unknown`,
        );
    }
  }

  private async evalCallExpression(
    expression: CallExpression,
  ): Promise<ExpressionType> {
    const fn = await this.evalExpression(expression.callee as Expression);
    const args = await Promise.all(
      expression.arguments.map(argument =>
        this.evalExpression(argument as Expression),
      ),
    );

    if (typeof fn === 'function') {
      return fn(...args);
    } else {
      throw new InvalidExressionError('Cannot call a non-function');
    }
  }

  private async evalCompoundExpression(
    expression: Compound,
  ): Promise<ExpressionType> {
    let result: ExpressionType | undefined;

    for (const item of expression.body) {
      result = await this.evalExpression(item as any);
    }

    if (result !== undefined) {
      return result;
    } else {
      throw new InvalidExressionError('Compound expression cannot be empty');
    }
  }

  private async evalConditionalExpression(
    expression: ConditionalExpression,
  ): Promise<ExpressionType> {
    const [test, consequent, alternate] = await Promise.all([
      this.evalExpression(expression.test as Expression),
      this.evalExpression(expression.consequent as Expression),
      this.evalExpression(expression.alternate as Expression),
    ]);

    return test ? consequent : alternate;
  }

  private evalIdentifierExpression(expression: Identifier): ExpressionType {
    const value = this._context[expression.name];

    if (value !== undefined) {
      return value;
    } else {
      throw new InvalidExressionError(
        `Indentifier ${expression.name} not found`,
      );
    }
  }

  private evalLiteralExpression(expression: Literal): SimpleType {
    return expression.value;
  }

  private async evalLogicalExpression(
    expression: LogicalExpression,
  ): Promise<ExpressionType> {
    const [left, right] = await Promise.all([
      this.evalExpression(expression.left as Expression),
      this.evalExpression(expression.right as Expression),
    ]);

    switch (expression.operator) {
      case '||':
        return left || right;
      case '&&':
        return left && right;
      default:
        throw new InvalidExressionError(
          `Logical operator ${expression.operator} is invalid`,
        );
    }
  }

  private async evalMemberExpression(
    expression: MemberExpression,
  ): Promise<ExpressionType> {
    const [value, property] = await Promise.all([
      this.evalExpression(expression.object as Expression),
      expression.property.type === 'Identifier'
        ? (expression.property as Identifier).name
        : this.evalExpression(expression.property as Expression),
    ]);

    if (typeof property !== 'string' && typeof property !== 'number') {
      throw new InvalidExressionError(
        `Cannot index with type ${typeof property}`,
      );
    }

    if (typeof value === 'object') {
      if (value.hasOwnProperty(property)) {
        return (value as any)[property];
      } else {
        throw new InvalidExressionError(
          `Value does not have property ${property}`,
        );
      }
    } else {
      throw new InvalidExressionError(`Cannot index type ${typeof value}`);
    }
  }

  private evalThisExpression(): TypeMap {
    return this._context;
  }

  private async evalUnaryExpression(
    expression: UnaryExpression,
  ): Promise<number | boolean> {
    const value = await this.evalExpression(expression.argument as Expression);

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
        throw new InvalidExressionError(
          `Unary operator ${expression.operator} is invalid`,
        );
    }
  }
}
