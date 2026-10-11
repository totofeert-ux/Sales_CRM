// src/lib/dedupe.ts
export function dedupeById<T extends { id: string }>(...lists: (T[] | undefined)[]) {
  const map = new Map<string, T>();
  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
