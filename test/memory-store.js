// Minimal in-memory stand-in for the @edgeone/pages-blob Store.
export class MemoryStore {
  constructor() { this.data = new Map(); this.reads = 0; this.writes = 0; }
  async get(key) { this.reads += 1; return this.data.has(key) ? structuredClone(this.data.get(key)) : null; }
  async setJSON(key, value, options = {}) {
    if (options.onlyIfNew && this.data.has(key)) throw Object.assign(new Error("conditional write failed"), { code: "PRECONDITION_FAILED" });
    this.writes += 1;
    this.data.set(key, structuredClone(value));
  }
  async delete(key) { this.data.delete(key); }
  async list({ prefix = "", cursor = "", limit = Infinity } = {}) {
    const keys = [...this.data.keys()].filter(key => key.startsWith(prefix) && key > cursor).sort();
    const selected = keys.slice(0, limit);
    return { blobs: selected.map(key => ({ key, etag: "x" })), directories: [],
      cursor: selected.length < keys.length ? selected.at(-1) : undefined };
  }
}
