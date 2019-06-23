interface ResultResolver<T> {
  resolve: (result: T) => void;
  target: string;
}

export class ResultListener<T> {
  private _results = new Map<string, T>();
  private _listeners: Array<ResultResolver<T>> = [];

  public onResult(id: string, result: T): void {
    const listeners = this._listeners.filter(listener => {
      return listener.target === id;
    });

    for (const listener of listeners) {
      listener.resolve(result);
      this._listeners.splice(this._listeners.indexOf(listener), 1);
    }
    this._results.set(id, result);
  }

  public async wait(id: string): Promise<T> {
    if (this._results.has(id)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this._results.get(id)!;
    }
    return new Promise(resolve => {
      this._listeners.push({
        resolve,
        target: id,
      });
    });
  }
}
