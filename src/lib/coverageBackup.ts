import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'
import {
  hasCoverageSnapshotFields,
  sanitizeCoverageMetrics,
  sanitizeCoverageOverrides,
} from './coverageSanitize'

export function sanitizeImportedOverrides(
  raw: unknown,
): Record<string, ComponentStatus> {
  return sanitizeCoverageOverrides(raw)
}

export function sanitizeImportedMetrics(
  raw: unknown,
): Record<string, CategorySelfMetrics> {
  return sanitizeCoverageMetrics(raw)
}

export type ParsedBackup = {
  overrides: Record<string, ComponentStatus>
  categoryMetrics: Record<string, CategorySelfMetrics>
  exportedAt?: string
  schemaVersion?: number
}

/** Parse exported `ai-life-coverage.json` (v2 shape or legacy overrides-only). */
export function parseCoverageBackupJson(text: string):
  | { ok: true; data: ParsedBackup }
  | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Backup must be a JSON object.' }
  }
  const p = parsed as Record<string, unknown>

  if (hasCoverageSnapshotFields(p)) {
    const exportedAt =
      typeof p.exportedAt === 'string' ? p.exportedAt : undefined
    const schemaVersion =
      typeof p.schemaVersion === 'number' && Number.isFinite(p.schemaVersion)
        ? p.schemaVersion
        : undefined
    const overrides = sanitizeImportedOverrides(p.overrides)
    const categoryMetrics = sanitizeImportedMetrics(p.categoryMetrics)
    if (
      Object.keys(overrides).length === 0 &&
      Object.keys(categoryMetrics).length === 0
    ) {
      return {
        ok: false,
        error: 'No valid status or mastery entries found in backup.',
      }
    }
    return {
      ok: true,
      data: {
        overrides,
        categoryMetrics,
        exportedAt,
        schemaVersion,
      },
    }
  }

  const legacyKeys = Object.keys(p)
  if (legacyKeys.length === 0) {
    return { ok: false, error: 'Backup object is empty.' }
  }
  const legacyOverrides = sanitizeImportedOverrides(parsed)
  if (Object.keys(legacyOverrides).length === 0) {
    return {
      ok: false,
      error: 'No valid component status entries found.',
    }
  }
  return {
    ok: true,
    data: {
      overrides: legacyOverrides,
      categoryMetrics: {},
    },
  }
}
