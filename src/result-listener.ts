interface ResultResolver<T> {
  resolve: (result: T) => void;
  target: string;
}

export class ResultListener<T> {
  private results = new Map<string, T>();
  private listeners: Array<ResultResolver<T>> = [];

  public onResult(id: string, result: T) {
    const listeners = this.listeners.filter(listener => {
      return listener.target === id;
    });

    for (const listener of listeners) {
      listener.resolve(result);
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    }
    this.results.set(id, result);
  }

  public async wait(id: string): Promise<T> {
    if (this.results.has(id)) {
      return this.results.get(id)!;
    }
    return new Promise(resolve => {
      this.listeners.push({
        resolve,
        target: id,
      });
    });
  }
}
