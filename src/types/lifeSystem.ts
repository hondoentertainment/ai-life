export type ComponentStatus =
  | 'implemented'
  | 'can_do'
  | 'in_progress'
  | 'planned'
  | 'not_started'
  | 'external'

export type SectionKind = 'layer' | 'domain' | 'addon' | 'future'

export interface ComponentItem {
  id: string
  label: string
  notes?: string
  tool?: string
  defaultStatus: ComponentStatus
}

export interface SectionGroup {
  id: string
  title: string
  kind: SectionKind
  description?: string
  components: ComponentItem[]
}

export interface IntegrationDef {
  id: string
  title: string
  description: string
  /** All of these groups must have coverage. */
  requiredGroupIds: string[]
  /** Each sub-array is an OR: at least one group in the sub-array must have coverage. */
  requiredOneOfGroups?: string[][]
}

export const STATUS_ORDER: ComponentStatus[] = [
  'implemented',
  'external',
  'can_do',
  'in_progress',
  'planned',
  'not_started',
]

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  implemented: 'Implemented',
  external: 'External tool',
  can_do: 'Can do',
  in_progress: 'In progress',
  planned: 'Planned',
  not_started: 'Not started',
}

export function statusWeight(s: ComponentStatus): number {
  const i = STATUS_ORDER.indexOf(s)
  return i === -1 ? 0 : STATUS_ORDER.length - i
}

/** Strong enough to count as “fed” into an integration. */
export function isActiveCoverage(s: ComponentStatus): boolean {
  return (
    s === 'implemented' ||
    s === 'external' ||
    s === 'can_do' ||
    s === 'in_progress'
  )
}

export function bestGroupStatus(
  group: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): ComponentStatus {
  let best: ComponentStatus = 'not_started'
  for (const c of group.components) {
    const s = overrides[c.id] ?? c.defaultStatus
    if (statusWeight(s) > statusWeight(best)) best = s
  }
  return best
}

export function groupHasCoverage(
  group: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): boolean {
  return isActiveCoverage(bestGroupStatus(group, overrides))
}

export function integrationSatisfied(
  integration: IntegrationDef,
  groupsById: Map<string, SectionGroup>,
  overrides: Record<string, ComponentStatus | undefined>,
): boolean {
  for (const gid of integration.requiredGroupIds) {
    const g = groupsById.get(gid)
    if (!g || !groupHasCoverage(g, overrides)) return false
  }
  if (integration.requiredOneOfGroups) {
    for (const orSet of integration.requiredOneOfGroups) {
      const ok = orSet.some((gid) => {
        const g = groupsById.get(gid)
        return g ? groupHasCoverage(g, overrides) : false
      })
      if (!ok) return false
    }
  }
  return true
}
