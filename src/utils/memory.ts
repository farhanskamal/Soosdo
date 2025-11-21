import { Task } from '../types';

export interface BoardMemory {
  planTasks?: Task[] | null;
  activePlanStep?: number | null;
  preferredLanguage?: string | null;
}

const MEMORY_PREFIX = 'soodo-ai-memory:';

function safeGetLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function makeKey(boardName: string): string {
  const name = boardName || 'default-board';
  return `${MEMORY_PREFIX}${name}`;
}

export function loadBoardMemory(boardName: string): BoardMemory {
  const ls = safeGetLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(makeKey(boardName));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BoardMemory;
    return parsed || {};
  } catch {
    return {};
  }
}

export function saveBoardMemory(boardName: string, memory: BoardMemory): void {
  const ls = safeGetLocalStorage();
  if (!ls) return;
  try {
    const current = loadBoardMemory(boardName);
    const merged: BoardMemory = {
      ...current,
      ...memory,
    };
    ls.setItem(makeKey(boardName), JSON.stringify(merged));
  } catch {
    // ignore write errors
  }
}
