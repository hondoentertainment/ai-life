import {
  groupsById,
  integrations,
  sectionGroups,
} from '../data/registry'
import type {
  CategorySelfMetrics,
  ComponentStatus,
  SectionGroup,
  SectionKind,
} from '../types/lifeSystem'
import {
  STATUS_LABELS,
  groupHasCoverage,
  integrationSatisfied,
  isActiveCoverage,
} from '../types/lifeSystem'

export const KIND_SORT: SectionKind[] = ['layer', 'domain', 'addon', 'future']

export const KIND_CLASS: Record<SectionGroup['kind'], string> = {
  layer: 'kind-layer',
  domain: 'kind-domain',
  addon: 'kind-addon',
  future: 'kind-future',
}

export const KIND_LABEL: Record<SectionGroup['kind'], string> = {
  layer: 'Core layer',
  domain: 'Life domain',
  addon: 'High-value add-on',
  future: 'Future',
}

export const STATUSES = Object.keys(STATUS_LABELS) as ComponentStatus[]

export const GITHUB_USER = 'hondoentertainment'

export function githubRepoHref(repo: string): string {
  return `https://github.com/${GITHUB_USER}/${encodeURIComponent(repo)}`
}

export const SHOWCASE_SELF_RATED_MIN = 70

/** Preset: only the CSV-backed project group. */
export const KIND_FILTER_CSV_ONLY = '__csv__'

export const CSV_SECTION_PREVIEW_ROWS = 30

export function statusToneClass(s: ComponentStatus): string {
  if (
    s === 'implemented' ||
    s === 'external' ||
    s === 'can_do' ||
    s === 'in_progress'
  ) {
    return 'tone-active'
  }
  if (s === 'planned') return 'tone-planned'
  return 'tone-quiet'
}

export function countActiveComponentsInGroup(
  g: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): number {
  return g.components.filter((c) =>
    isActiveCoverage(overrides[c.id] ?? c.defaultStatus),
  ).length
}

export function clampPctInput(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function masteryAverages(categoryMetrics: Record<string, CategorySelfMetrics>) {
  let pSum = 0
  let pN = 0
  let cSum = 0
  let cN = 0
  for (const m of Object.values(categoryMetrics)) {
    if (typeof m.proficiency === 'number') {
      pSum += m.proficiency
      pN++
    }
    if (typeof m.percentComplete === 'number') {
      cSum += m.percentComplete
      cN++
    }
  }
  return {
    avgProficiency: pN > 0 ? Math.round(pSum / pN) : null,
    avgPercentComplete: cN > 0 ? Math.round(cSum / cN) : null,
    profCount: pN,
    completeCount: cN,
  }
}

export function weakGroups(
  overrides: Record<string, ComponentStatus | undefined>,
): SectionGroup[] {
  return sectionGroups.filter(
    (g) => g.kind !== 'future' && !groupHasCoverage(g, overrides),
  )
}

export type IntegrationFocusHint = {
  integrationTitle: string
  message: string
}

export function getFirstBlockedIntegrationFocus(
  overrides: Record<string, ComponentStatus | undefined>,
): IntegrationFocusHint | null {
  const blocked = integrations.filter(
    (i) => !integrationSatisfied(i, groupsById, overrides),
  )
  const i = blocked[0]
  if (!i) return null
  for (const gid of i.requiredGroupIds) {
    const g = groupsById.get(gid)
    if (!g || !groupHasCoverage(g, overrides)) {
      return {
        integrationTitle: i.title,
        message: `No active coverage in "${g?.title ?? gid}" (required).`,
      }
    }
  }
  if (i.requiredOneOfGroups) {
    for (const orSet of i.requiredOneOfGroups) {
      const ok = orSet.some((gid) => {
        const g = groupsById.get(gid)
        return g ? groupHasCoverage(g, overrides) : false
      })
      if (!ok) {
        const labels = orSet
          .map((gid) => groupsById.get(gid)?.title ?? gid)
          .join(', ')
        return {
          integrationTitle: i.title,
          message: `Need active coverage in at least one of: ${labels}.`,
        }
      }
    }
  }
  return null
}
