import { useCallback, useEffect, useState } from 'react'
import type { ComponentStatus } from '../types/lifeSystem'

const STORAGE_KEY = 'ai-life-coverage-v1'

export function useCoverageStore() {
  const [overrides, setOverrides] = useState<
    Record<string, ComponentStatus>
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return {}
      const p = JSON.parse(raw) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return p as Record<string, ComponentStatus>
      }
    } catch {
      /* ignore */
    }
    return {}
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    } catch {
      /* ignore */
    }
  }, [overrides])

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

  const resetAll = useCallback(() => setOverrides({}), [])

  return { overrides, setStatus, clearOverride, resetAll }
}
