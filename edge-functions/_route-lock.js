import { HttpError, isCodeShape } from "./_lib.js";

// Blob offers create-if-absent, but no compare-and-swap or multi-key transaction.
// Serialize administrative changes to the same first path segment across isolates.
export async function withRouteLocks(store, names, run) {
  const acquired = [];
  try {
    for (const name of [...new Set(names.filter(isCodeShape))].sort()) {
      const key = "route-locks/" + name + ".json";
      try {
        await store.setJSON(key, { since: new Date().toISOString() }, { onlyIfNew: true });
      } catch (error) {
        if (error?.code === "PRECONDITION_FAILED") throw new HttpError(409, "Another change is in progress for this path");
        throw error;
      }
      acquired.push(key);
    }
    return await run();
  } finally {
    await Promise.all(acquired.map((key) => store.delete(key)));
  }
}
