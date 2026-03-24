import { describe, expect, it } from 'vitest'
import { integrations, sectionGroups } from './registry'

describe('registry integration references', () => {
  it('requiredGroupIds and OR-sets point at real section groups', () => {
    const ids = new Set(sectionGroups.map((g) => g.id))
    const errors: string[] = []
    for (const i of integrations) {
      for (const gid of i.requiredGroupIds) {
        if (!ids.has(gid)) {
          errors.push(`${i.id} → missing group "${gid}"`)
        }
      }
      for (const row of i.requiredOneOfGroups ?? []) {
        for (const gid of row) {
          if (!ids.has(gid)) {
            errors.push(`${i.id} OR-set → missing group "${gid}"`)
          }
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })
})
