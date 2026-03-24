import { describe, expect, it } from 'vitest'
import type { IntegrationDef, SectionGroup } from './lifeSystem'
import { integrationSatisfied } from './lifeSystem'

const gActive: SectionGroup = {
  id: 'grp-a',
  kind: 'layer',
  title: 'A',
  components: [
    { id: 'c1', label: 'One', defaultStatus: 'implemented' },
  ],
}

const gQuiet: SectionGroup = {
  id: 'grp-b',
  kind: 'layer',
  title: 'B',
  components: [
    { id: 'c2', label: 'Two', defaultStatus: 'not_started' },
  ],
}

const map = new Map<string, SectionGroup>([
  ['grp-a', gActive],
  ['grp-b', gQuiet],
])

const integ: IntegrationDef = {
  id: 'i1',
  title: 'Test',
  description: '',
  requiredGroupIds: ['grp-a', 'grp-b'],
}

describe('integrationSatisfied', () => {
  it('is false when any required group has no active coverage', () => {
    expect(integrationSatisfied(integ, map, {})).toBe(false)
  })

  it('is true when overrides lift quiet group to active', () => {
    expect(
      integrationSatisfied(integ, map, {
        c2: 'in_progress',
      }),
    ).toBe(true)
  })

  it('respects requiredOneOfGroups', () => {
    const orOk: IntegrationDef = {
      id: 'i2',
      title: 'OR',
      description: '',
      requiredGroupIds: [],
      requiredOneOfGroups: [['grp-a', 'grp-b']],
    }
    expect(integrationSatisfied(orOk, map, {})).toBe(true)
    const orFail: IntegrationDef = {
      id: 'i3',
      title: 'OR fail',
      description: '',
      requiredGroupIds: [],
      requiredOneOfGroups: [['grp-b']],
    }
    expect(integrationSatisfied(orFail, map, {})).toBe(false)
  })
})
