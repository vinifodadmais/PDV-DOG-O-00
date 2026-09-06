export class LocalStoragePolyfill {
  constructor(initial = {}) {
    this.store = { ...initial };
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  key(index) {
    return Object.keys(this.store)[index] ?? null;
  }
  get length() {
    return Object.keys(this.store).length;
  }
  dump() {
    return { ...this.store };
  }
}
