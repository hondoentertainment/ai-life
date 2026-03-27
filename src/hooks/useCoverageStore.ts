import { useCallback, useEffect, useState } from 'react'
import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'
import { COVERAGE_STORAGE_KEY_V2 } from '../lib/storageKeys'
import {
  clampPct,
  hasCoverageSnapshotFields,
  isLegacyCoverageOverridesRecord,
  sanitizeCoverageMetrics,
  sanitizeCoverageOverrides,
} from '../lib/coverageSanitize'

const STORAGE_KEY_V1 = 'ai-life-coverage-v1'
const STORAGE_KEY_V2 = COVERAGE_STORAGE_KEY_V2

function loadPersisted(): {
  overrides: Record<string, ComponentStatus>
  categoryMetrics: Record<string, CategorySelfMetrics>
  migratedFromV1: boolean
} {
  try {
    const v2raw = localStorage.getItem(STORAGE_KEY_V2)
    if (v2raw) {
      const p = JSON.parse(v2raw) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        const po = p as Record<string, unknown>
        if (hasCoverageSnapshotFields(po)) {
          return {
            overrides: sanitizeCoverageOverrides(po.overrides),
            categoryMetrics: sanitizeCoverageMetrics(po.categoryMetrics),
            migratedFromV1: false,
          }
        }
      }
    }
    const v1raw = localStorage.getItem(STORAGE_KEY_V1)
    if (v1raw) {
      const p = JSON.parse(v1raw) as unknown
      if (isLegacyCoverageOverridesRecord(p)) {
        return {
          overrides: sanitizeCoverageOverrides(p),
          categoryMetrics: {},
          migratedFromV1: true,
        }
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

  const importBackup = useCallback(
    (data: {
      overrides: Record<string, ComponentStatus>
      categoryMetrics: Record<string, CategorySelfMetrics>
    }) => {
      setOverrides(data.overrides)
      setCategoryMetrics(data.categoryMetrics)
    },
    [],
  )

  return {
    overrides,
    categoryMetrics,
    setStatus,
    clearOverride,
    setCategoryMetric,
    resetAll,
    importBackup,
  }
}
