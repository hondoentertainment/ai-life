import { describe, expect, it } from 'vitest'
import { applyImportMergePlan } from './importMerge'

describe('applyImportMergePlan', () => {
  const current = {
    overrides: { a: 'planned' as const, b: 'implemented' as const },
    categoryMetrics: { g1: { proficiency: 10 }, g2: { percentComplete: 20 } },
  }
  const imported = {
    overrides: { a: 'implemented' as const, c: 'can_do' as const },
    categoryMetrics: { g1: { proficiency: 90 }, g3: { percentComplete: 50 } },
  }

  it('replace_all uses only imported snapshot', () => {
    const out = applyImportMergePlan('replace_all', current, imported)
    expect(out.overrides).toEqual(imported.overrides)
    expect(out.categoryMetrics).toEqual(imported.categoryMetrics)
  })

  it('merge_statuses keeps existing metrics', () => {
    const out = applyImportMergePlan('merge_statuses', current, imported)
    expect(out.overrides).toEqual({
      a: 'implemented',
      b: 'implemented',
      c: 'can_do',
    })
    expect(out.categoryMetrics).toEqual(current.categoryMetrics)
  })

  it('merge_mastery keeps existing overrides', () => {
    const out = applyImportMergePlan('merge_mastery', current, imported)
    expect(out.overrides).toEqual(current.overrides)
    expect(out.categoryMetrics.g1?.proficiency).toBe(90)
    expect(out.categoryMetrics.g2).toEqual({ percentComplete: 20 })
    expect(out.categoryMetrics.g3).toEqual({ percentComplete: 50 })
  })

  it('merge_both unions both maps', () => {
    const out = applyImportMergePlan('merge_both', current, imported)
    expect(out.overrides.a).toBe('implemented')
    expect(out.overrides.c).toBe('can_do')
    expect(out.categoryMetrics.g1?.proficiency).toBe(90)
  })

  it('throws for unsupported mode at runtime', () => {
    expect(() =>
      applyImportMergePlan(
        'invalid_mode' as unknown as Parameters<typeof applyImportMergePlan>[0],
        current,
        imported,
      ),
    ).toThrow(/Unsupported import merge mode/i)
  })
})
