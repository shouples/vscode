import { Memento } from "vscode";

export class InMemoryMemento implements Memento {
  private store = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.store.get(key);
  }

  update(key: string, value: any): Thenable<void> {
    if (value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }
}
