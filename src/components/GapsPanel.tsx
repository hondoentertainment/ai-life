import { useMemo } from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from '../data/registry'
import { weakGroups } from '../lib/constants'
import type {
  ComponentItem,
  ComponentStatus,
  SectionGroup,
} from '../types/lifeSystem'
import {
  STATUS_LABELS,
  integrationSatisfied,
  statusWeight,
} from '../types/lifeSystem'

export function GapsPanel({
  overrides,
  onGoSections,
  onGoIntegrations,
}: {
  overrides: Record<string, ComponentStatus | undefined>
  onGoSections: () => void
  onGoIntegrations: () => void
}) {
  const weak = weakGroups(overrides)
  const noSignal = useMemo(() => {
    const rows: { group: SectionGroup; comp: ComponentItem }[] = []
    for (const g of sectionGroups) {
      if (g.kind === 'future') continue
      for (const c of g.components) {
        const s = overrides[c.id] ?? c.defaultStatus
        if (s === 'not_started' || s === 'planned') {
          rows.push({ group: g, comp: c })
        }
      }
    }
    rows.sort(
      (a, b) =>
        statusWeight(overrides[a.comp.id] ?? a.comp.defaultStatus) -
        statusWeight(overrides[b.comp.id] ?? b.comp.defaultStatus),
    )
    return rows
  }, [overrides])

  const blocked = integrations.filter(
    (i) => !integrationSatisfied(i, groupsById, overrides),
  )

  return (
    <div className="panel">
      <div className="jump-bar">
        <span className="jump-label">Jump to</span>
        <a href="#gaps-quiet" className="jump-link">
          Quiet groups
        </a>
        <a href="#gaps-integrations" className="jump-link">
          Blocked integrations
        </a>
        <a href="#gaps-backlog" className="jump-link">
          Backlog items
        </a>
      </div>

      <h2 className="panel-heading" id="gaps-quiet">
        Section groups with no active coverage
      </h2>
      <p className="panel-lead muted">
        A group is quiet when every component is only Planned or Not started.
        Improving these gives your briefs and reports more to work with.
      </p>
      {weak.length === 0 ? (
        <p className="empty-hint empty-block positive">
          Every life-area group has at least one active component.
        </p>
      ) : (
        <ul className="gap-list">
          {weak.map((g) => (
            <li key={g.id}>
              <strong>{g.title}</strong> — add a tool, mark something in
              progress, or promote a "can do" item in{' '}
              <button type="button" className="link-btn" onClick={onGoSections}>
                Sections
              </button>
              .
            </li>
          ))}
        </ul>
      )}

      <h2 className="panel-heading panel-heading-spaced" id="gaps-integrations">
        Integration blockers
      </h2>
      {blocked.length === 0 ? (
        <p className="empty-hint empty-block positive">
          All spine integrations are satisfied.
        </p>
      ) : (
        <ul className="gap-list">
          {blocked.map((i) => (
            <li key={i.id}>
              <strong>{i.title}</strong> — open{' '}
              <button
                type="button"
                className="link-btn"
                onClick={onGoIntegrations}
              >
                Integrations
              </button>{' '}
              for the checklist, then adjust statuses in Sections.
            </li>
          ))}
        </ul>
      )}

      <h2 className="panel-heading panel-heading-spaced" id="gaps-backlog">
        Components still planned or not started
      </h2>
      <p className="panel-lead muted">
        Weakest statuses first. Use Sections search to find a specific line.
      </p>
      {noSignal.length === 0 ? (
        <p className="empty-hint empty-block positive">Nothing in the backlog.</p>
      ) : (
        <ul className="gap-list gap-list-dense">
          {noSignal.slice(0, 40).map(({ group, comp }) => {
            const s: ComponentStatus = overrides[comp.id] ?? comp.defaultStatus
            return (
              <li key={comp.id}>
                <span className="gap-group">{group.title}</span>
                <span className="gap-sep">·</span>
                <span>{comp.label}</span>
                <span className="gap-status">{STATUS_LABELS[s]}</span>
              </li>
            )
          })}
        </ul>
      )}
      {noSignal.length > 40 ? (
        <p className="empty-hint">
          +{noSignal.length - 40} more — narrow with Search on the Sections tab.
        </p>
      ) : null}

      <details className="ux-hint-details gaps-registry-note">
        <summary className="ux-hint-summary">Registry maintenance</summary>
        <div className="ux-hint-body">
          <p>
            When you change <code className="inline-code">registry.ts</code> or
            the CSV import, review quiet groups and duplicate or stale components
            so Showcase and Integrations stay trustworthy.
          </p>
        </div>
      </details>
    </div>
  )
}
