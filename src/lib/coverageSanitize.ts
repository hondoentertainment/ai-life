import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'

const STATUS_VALUES = new Set<string>([
  'implemented',
  'external',
  'can_do',
  'in_progress',
  'planned',
  'not_started',
])

export function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function sanitizeCoverageOverrides(
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

export function sanitizeCoverageMetrics(
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

export function hasCoverageSnapshotFields(obj: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(obj, 'overrides') ||
    Object.prototype.hasOwnProperty.call(obj, 'categoryMetrics')
  )
}

export function isLegacyCoverageOverridesRecord(
  obj: unknown,
): obj is Record<string, ComponentStatus> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const o = obj as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length === 0) return true
  return keys.every((k) => STATUS_VALUES.has(String(o[k])))
}
