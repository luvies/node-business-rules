export class RuntimeValue {
  public static isRuntimeValue(obj: unknown): obj is RuntimeValue {
    return obj instanceof RuntimeValue;
  }
}
