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
  /** External product or vendor (e.g. Apple, Fitbod). */
  tool?: string
  /** GitHub repo name under hondoentertainment (slug only). */
  repo?: string
  /** Full repo URL when not under the default GitHub org. */
  repoUrl?: string
  /** External link (e.g. prototype or doc) separate from repo. */
  locationUrl?: string
  defaultStatus: ComponentStatus
}

export interface SectionGroup {
  id: string
  title: string
  kind: SectionKind
  description?: string
  components: ComponentItem[]
}

/** Self-rated mastery per catalog category (section group), 0–100. */
export interface CategorySelfMetrics {
  proficiency?: number
  percentComplete?: number
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

/** Short hints for tooltips and onboarding copy. */
export const STATUS_DESCRIPTIONS: Record<ComponentStatus, string> = {
  implemented: 'Built and in use in your life OS.',
  external: 'Covered by an app or service you rely on.',
  can_do: 'You could turn this on without major new build work.',
  in_progress: 'Actively building or wiring this up.',
  planned: 'On the roadmap; not active signal yet.',
  not_started: 'No work or tool attached yet.',
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

/** Share of components in the group with active coverage status (0–100). */
export function groupSignalPercent(
  group: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): number {
  const total = group.components.length
  if (total === 0) return 0
  const active = group.components.filter((c) =>
    isActiveCoverage(overrides[c.id] ?? c.defaultStatus),
  ).length
  return Math.round((active / total) * 100)
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
