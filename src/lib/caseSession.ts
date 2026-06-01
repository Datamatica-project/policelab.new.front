import type { FileUploadResult, ReplaceFileResult } from "@/lib/api";
import type { BBox } from "@/components/cases/ManualEditModal";

const SESSION_KEY = "new-case-draft";
const IDB_NAME = "policelab-uploads";
const IDB_STORE = "original-files";
const IDB_VERSION = 1;

export interface SessionFile {
  id: number;
  name: string;
  sizeMB: number;
  seed: number;
  category: string;
  tags: string[];
  policy: string;
  description: string;
  uploadResult?: FileUploadResult;
}

export interface CaseSessionData {
  caseId: string;
  step: 3 | 4;
  caseNumber: string;
  caseName: string;
  assignedTo: string;
  assignedToName: string;
  desc: string;
  files: SessionFile[];
  reviewedBoxes: Record<number, BBox[]>;
  replaceResults?: ReplaceFileResult[];
}

export function saveCaseSession(data: CaseSessionData): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceededError - silently ignore
  }
}

export function loadCaseSession(): CaseSessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CaseSessionData;
  } catch {
    return null;
  }
}

export function clearCaseSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOriginalFiles(
  caseId: string,
  files: { id: number; file: File }[],
): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  for (const { id, file } of files) {
    store.put(file, `${caseId}_${id}`);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadOriginalFiles(
  caseId: string,
  fileIds: number[],
): Promise<Map<number, File>> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readonly");
  const store = tx.objectStore(IDB_STORE);
  const result = new Map<number, File>();

  await Promise.all(
    fileIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          const req = store.get(`${caseId}_${id}`);
          req.onsuccess = () => {
            if (req.result) result.set(id, req.result as File);
            resolve();
          };
          req.onerror = () => resolve();
        }),
    ),
  );

  db.close();
  return result;
}

export async function saveMosaicFile(caseId: string, fileId: string, blob: Blob): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readwrite");
  tx.objectStore(IDB_STORE).put(blob, `${caseId}_${fileId}_mosaic`);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadMosaicFile(caseId: string, fileId: string): Promise<Blob | null> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readonly");
  return new Promise((resolve) => {
    const req = tx.objectStore(IDB_STORE).get(`${caseId}_${fileId}_mosaic`);
    req.onsuccess = () => { db.close(); resolve((req.result as Blob) ?? null); };
    req.onerror = () => { db.close(); resolve(null); };
  });
}

export async function clearMosaicFiles(caseId: string, fileIds: string[]): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const id of fileIds) {
      store.delete(`${caseId}_${id}_mosaic`);
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    // ignore
  }
}

export async function clearOriginalFiles(
  caseId: string,
  fileIds: number[],
): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const id of fileIds) {
      store.delete(`${caseId}_${id}`);
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    // ignore
  }
}
