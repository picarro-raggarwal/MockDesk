import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface AuditRow {
  id: string;
  at: string;
  kind: string;
  detail: string;
}

interface MockDeskAuditDB extends DBSchema {
  actions: {
    key: string;
    value: AuditRow;
    indexes: { "by-at": string };
  };
}

let dbPromise: Promise<IDBPDatabase<MockDeskAuditDB>> | null = null;
const DB_NAME = "mockdesk-audit";
const STORE = "actions";
const MAX = 500;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<MockDeskAuditDB>(DB_NAME, 1, {
      upgrade(db) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("by-at", "at");
      },
    });
  }
  return dbPromise;
}

export async function appendAudit(kind: string, detail: string): Promise<void> {
  try {
    const db = await getDb();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const row: AuditRow = { id, at: new Date().toISOString(), kind, detail };
    await db.put(STORE, row);
    const keys = await db.getAllKeys(STORE);
    if (keys.length > MAX) {
      const rows = await db.getAll(STORE);
      rows.sort((a, b) => a.at.localeCompare(b.at));
      const toDrop = rows.slice(0, rows.length - MAX);
      const tx = db.transaction(STORE, "readwrite");
      for (const r of toDrop) await tx.store.delete(r.id);
      await tx.done;
    }
  } catch {
    /* ignore */
  }
}

export async function readAudit(limit = 100): Promise<Pick<AuditRow, "at" | "kind" | "detail">[]> {
  try {
    const db = await getDb();
    const rows = await db.getAll(STORE);
    return rows
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(({ at, kind, detail }) => ({ at, kind, detail }));
  } catch {
    return [];
  }
}
