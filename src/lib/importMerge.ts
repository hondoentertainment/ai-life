import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'

export type ImportMergeMode =
  | 'replace_all'
  | 'merge_statuses'
  | 'merge_mastery'
  | 'merge_both'

export type CoverageSnapshot = {
  overrides: Record<string, ComponentStatus>
  categoryMetrics: Record<string, CategorySelfMetrics>
}

/** Pure merge rules for JSON import (used by UI + unit tests). */
export function applyImportMergePlan(
  mode: ImportMergeMode,
  current: CoverageSnapshot,
  imported: CoverageSnapshot,
): CoverageSnapshot {
  switch (mode) {
    case 'replace_all':
      return {
        overrides: { ...imported.overrides },
        categoryMetrics: { ...imported.categoryMetrics },
      }
    case 'merge_statuses':
      return {
        overrides: { ...current.overrides, ...imported.overrides },
        categoryMetrics: { ...current.categoryMetrics },
      }
    case 'merge_mastery':
      return {
        overrides: { ...current.overrides },
        categoryMetrics: { ...current.categoryMetrics, ...imported.categoryMetrics },
      }
    case 'merge_both':
      return {
        overrides: { ...current.overrides, ...imported.overrides },
        categoryMetrics: { ...current.categoryMetrics, ...imported.categoryMetrics },
      }
    default:
      return { ...current }
  }
}
