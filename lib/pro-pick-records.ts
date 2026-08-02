"use client";

import { useSyncExternalStore } from "react";
import type { ProPick, ProRegion } from "./pro-picks";

export type MatchOutcome = "left" | "right" | "draw";

export type MatchRecord = {
  id: string;
  recordedAt: string;
  outcome: MatchOutcome;
  left: ProPick;
  right: ProPick | null;
};

export const MAX_MATCH_RECORDS = 100;

const STORAGE_KEY = "valorandomizer.proPick.matchRecords";
const CHANGE_EVENT = "valorandomizer:match-records-change";
const EMPTY_RECORDS: readonly MatchRecord[] = [];
const PRO_REGIONS: readonly ProRegion[] = ["Americas", "EMEA", "Pacific", "China"];

let cachedRaw: string | null | undefined;
let cachedRecords: readonly MatchRecord[] = EMPTY_RECORDS;

export function useMatchRecords(): readonly MatchRecord[] {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY_RECORDS);
}

export function saveMatchRecords(records: readonly MatchRecord[]): boolean {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_MATCH_RECORDS)),
    );
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearMatchRecords(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function readSnapshot(): readonly MatchRecord[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_RECORDS;
  }

  if (raw === cachedRaw) return cachedRecords;
  cachedRaw = raw;
  cachedRecords = parseRecords(raw);
  return cachedRecords;
}

function parseRecords(raw: string | null): readonly MatchRecord[] {
  if (!raw) return EMPTY_RECORDS;

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY_RECORDS;
    return value.filter(isMatchRecord).slice(0, MAX_MATCH_RECORDS);
  } catch {
    return EMPTY_RECORDS;
  }
}

function isMatchRecord(value: unknown): value is MatchRecord {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.recordedAt === "string" &&
    (value.outcome === "left" || value.outcome === "right" || value.outcome === "draw") &&
    isProPick(value.left) &&
    (value.right === null || isProPick(value.right))
  );
}

function isProPick(value: unknown): value is ProPick {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.event === "string" &&
    typeof value.match === "string" &&
    typeof value.map === "string" &&
    typeof value.team === "string" &&
    typeof value.region === "string" &&
    PRO_REGIONS.includes(value.region as ProRegion) &&
    Array.isArray(value.agents) &&
    value.agents.length === 5 &&
    value.agents.every((agent) => typeof agent === "string") &&
    (value.source === undefined || typeof value.source === "string")
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
