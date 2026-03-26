import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'

const STATUS_VALUES = new Set<string>([
  'implemented',
  'external',
  'can_do',
  'in_progress',
  'planned',
  'not_started',
])

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function sanitizeImportedOverrides(
  raw: unknown,
): Record<string, ComponentStatus> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Record<string, ComponentStatus> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && STATUS_VALUES.has(v)) {
      out[k] = v as ComponentStatus
    }
  }
  return out
}

export function sanitizeImportedMetrics(
  raw: unknown,
): Record<string, CategorySelfMetrics> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, CategorySelfMetrics> = {}
  for (const [gid, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const m = v as Record<string, unknown>
    const next: CategorySelfMetrics = {}
    if (typeof m.proficiency === 'number')
      next.proficiency = clampPct(m.proficiency)
    if (typeof m.percentComplete === 'number')
      next.percentComplete = clampPct(m.percentComplete)
    if (next.proficiency !== undefined || next.percentComplete !== undefined) {
      out[gid] = next
    }
  }
  return out
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
  const hasOverrides = Object.prototype.hasOwnProperty.call(p, 'overrides')
  const hasCategoryMetrics = Object.prototype.hasOwnProperty.call(
    p,
    'categoryMetrics',
  )

  if (hasOverrides || hasCategoryMetrics) {
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
