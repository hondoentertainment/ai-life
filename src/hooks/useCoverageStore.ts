import { useCallback, useEffect, useState } from 'react'
import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'

const STORAGE_KEY_V1 = 'ai-life-coverage-v1'
const STORAGE_KEY_V2 = 'ai-life-coverage-v2'

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

function isLegacyOverridesRecord(
  obj: unknown,
): obj is Record<string, ComponentStatus> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const o = obj as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length === 0) return true
  return keys.every((k) => STATUS_VALUES.has(String(o[k])))
}

function sanitizeMetrics(raw: unknown): Record<string, CategorySelfMetrics> {
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

function loadPersisted(): {
  overrides: Record<string, ComponentStatus>
  categoryMetrics: Record<string, CategorySelfMetrics>
  migratedFromV1: boolean
} {
  try {
    const v2raw = localStorage.getItem(STORAGE_KEY_V2)
    if (v2raw) {
      const p = JSON.parse(v2raw) as unknown
      if (
        p &&
        typeof p === 'object' &&
        !Array.isArray(p) &&
        'overrides' in p &&
        p.overrides &&
        typeof p.overrides === 'object'
      ) {
        const po = p as {
          overrides: Record<string, ComponentStatus>
          categoryMetrics?: unknown
        }
        return {
          overrides: po.overrides,
          categoryMetrics: sanitizeMetrics(po.categoryMetrics),
          migratedFromV1: false,
        }
      }
    }
    const v1raw = localStorage.getItem(STORAGE_KEY_V1)
    if (v1raw) {
      const p = JSON.parse(v1raw) as unknown
      if (isLegacyOverridesRecord(p)) {
        return { overrides: p, categoryMetrics: {}, migratedFromV1: true }
      }
    }
  } catch {
    /* ignore */
  }
  return { overrides: {}, categoryMetrics: {}, migratedFromV1: false }
}

const initial = loadPersisted()

export function useCoverageStore() {
  const [overrides, setOverrides] = useState<Record<string, ComponentStatus>>(
    () => initial.overrides,
  )
  const [categoryMetrics, setCategoryMetrics] = useState<
    Record<string, CategorySelfMetrics>
  >(() => initial.categoryMetrics)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_V2,
        JSON.stringify({ overrides, categoryMetrics }),
      )
      if (localStorage.getItem(STORAGE_KEY_V1)) {
        localStorage.removeItem(STORAGE_KEY_V1)
      }
    } catch {
      /* ignore */
    }
  }, [overrides, categoryMetrics])

  const setStatus = useCallback((componentId: string, status: ComponentStatus) => {
    setOverrides((prev) => ({ ...prev, [componentId]: status }))
  }, [])

  const clearOverride = useCallback((componentId: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[componentId]
      return next
    })
  }, [])

  const setCategoryMetric = useCallback(
    (
      groupId: string,
      field: keyof Pick<CategorySelfMetrics, 'proficiency' | 'percentComplete'>,
      value: number | undefined,
    ) => {
      setCategoryMetrics((prev) => {
        const cur = prev[groupId] ?? {}
        const nextEntry: CategorySelfMetrics = { ...cur }
        if (value === undefined) {
          delete nextEntry[field]
        } else {
          nextEntry[field] = clampPct(value)
        }
        const next = { ...prev }
        if (
          nextEntry.proficiency === undefined &&
          nextEntry.percentComplete === undefined
        ) {
          delete next[groupId]
        } else {
          next[groupId] = nextEntry
        }
        return next
      })
    },
    [],
  )

  const resetAll = useCallback(() => {
    setOverrides({})
    setCategoryMetrics({})
  }, [])

  return {
    overrides,
    categoryMetrics,
    setStatus,
    clearOverride,
    setCategoryMetric,
    resetAll,
  }
}
