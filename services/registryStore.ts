import { RunRecord } from '../types';

const STORAGE_KEY = 'microagent-runs';

const inMemory: RunRecord[] = [];

function canUseLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readAll(): RunRecord[] {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as RunRecord[];
    } catch (e) {
      console.warn('Failed to parse run registry; resetting.', e);
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }
  return inMemory;
}

function writeAll(records: RunRecord[]) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } else {
    inMemory.splice(0, inMemory.length, ...records);
  }
}

export function listRuns(): RunRecord[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getRun(id: string): RunRecord | undefined {
  return readAll().find(r => r.id === id);
}

export function saveRun(run: RunRecord): void {
  const existing = readAll();
  const idx = existing.findIndex(r => r.id === run.id);
  if (idx >= 0) {
    existing[idx] = run;
  } else {
    existing.push(run);
  }
  writeAll(existing);
}

export function updateRun(id: string, patch: Partial<RunRecord>): RunRecord | null {
  const existing = readAll();
  const idx = existing.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const updated = { ...existing[idx], ...patch };
  existing[idx] = updated;
  writeAll(existing);
  return updated;
}

export function latestRun(): RunRecord | undefined {
  return listRuns()[0];
}
