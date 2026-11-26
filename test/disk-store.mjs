// Local preview only. Keep credentials outside the published project tree.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryStore } from "./memory-store.js";

export class DiskStore extends MemoryStore {
  constructor(directory) {
    super();
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.file = join(directory, "local-blob.json");
    try { this.data = new Map(JSON.parse(readFileSync(this.file, "utf8"))); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  persist() {
    const tmp = this.file + "." + process.pid + ".tmp";
    writeFileSync(tmp, JSON.stringify([...this.data]), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
  async setJSON(key, value, options) { await super.setJSON(key, value, options); this.persist(); }
  async delete(key) { await super.delete(key); this.persist(); }
}
