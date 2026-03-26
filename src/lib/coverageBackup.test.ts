import { describe, expect, it } from 'vitest'
import { parseCoverageBackupJson } from './coverageBackup'

describe('parseCoverageBackupJson', () => {
  it('parses v2 export shape', () => {
    const r = parseCoverageBackupJson(
      JSON.stringify({
        exportedAt: '2020-01-01',
        overrides: { x: 'implemented', bad: 1, y: 'nope' },
        categoryMetrics: {
          g: { proficiency: 150, percentComplete: -5 },
        },
        registryVersion: 3,
        schemaVersion: 4,
      }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.overrides).toEqual({ x: 'implemented' })
    expect(r.data.categoryMetrics.g?.proficiency).toBe(100)
    expect(r.data.categoryMetrics.g?.percentComplete).toBe(0)
    expect(r.data.exportedAt).toBe('2020-01-01')
    expect(r.data.schemaVersion).toBe(4)
  })

  it('parses v2 backup with mastery only', () => {
    const r = parseCoverageBackupJson(
      JSON.stringify({
        categoryMetrics: {
          g: { proficiency: 42, percentComplete: 80 },
        },
      }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.overrides).toEqual({})
    expect(r.data.categoryMetrics).toEqual({
      g: { proficiency: 42, percentComplete: 80 },
    })
  })

  it('parses v2 backup with null overrides and valid mastery', () => {
    const r = parseCoverageBackupJson(
      JSON.stringify({
        overrides: null,
        categoryMetrics: {
          g: { proficiency: 12 },
        },
      }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.overrides).toEqual({})
    expect(r.data.categoryMetrics).toEqual({ g: { proficiency: 12 } })
  })

  it('rejects v2 backup with no valid status or mastery entries', () => {
    const r = parseCoverageBackupJson(
      JSON.stringify({
        overrides: {},
        categoryMetrics: {},
      }),
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/No valid status or mastery entries/i)
  })

  it('parses legacy overrides-only object', () => {
    const r = parseCoverageBackupJson(JSON.stringify({ foo: 'planned' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.overrides).toEqual({ foo: 'planned' })
    expect(r.data.categoryMetrics).toEqual({})
  })

  it('rejects invalid JSON', () => {
    const r = parseCoverageBackupJson('{')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/valid JSON/i)
  })

  it('rejects v2 backup when categoryMetrics is present but invalid', () => {
    const r = parseCoverageBackupJson(
      JSON.stringify({
        categoryMetrics: [],
      }),
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/No valid status or mastery entries/i)
  })
})
