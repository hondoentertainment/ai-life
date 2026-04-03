import { useMemo } from 'react'
import {
  groupsById,
  integrations,
} from '../data/registry'
import type {
  ComponentStatus,
} from '../types/lifeSystem'
import {
  STATUS_LABELS,
  bestGroupStatus,
  groupHasCoverage,
  integrationSatisfied,
} from '../types/lifeSystem'

export function IntegrationsPanel({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
}) {
  return (
    <div className="panel">
      <h2 className="panel-heading">Integration requirements</h2>
      <p className="panel-lead muted">
        Required groups must all have active coverage. "At least one of" rows
        mean any single listed group is enough (for example, any health slice).
      </p>
      <div className="integration-cards">
        {integrations.map((i) => {
          const ok = integrationSatisfied(i, groupsById, overrides)
          return (
            <article
              key={i.id}
              className={`integration-card ${ok ? 'ok' : 'bad'}`}
            >
              <div className="integration-card-head">
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.description}</p>
                </div>
                <span className={`badge ${ok ? 'badge-ok' : 'badge-bad'}`}>
                  {ok ? 'Satisfied' : 'Blocked'}
                </span>
              </div>
              <ul className="req-list">
                {i.requiredGroupIds.map((gid) => {
                  const g = groupsById.get(gid)
                  const cov = g
                    ? groupHasCoverage(g, overrides)
                    : false
                  const best = g ? bestGroupStatus(g, overrides) : undefined
                  return (
                    <li key={gid} className={cov ? 'req-ok' : 'req-bad'}>
                      <span className="req-icon" aria-hidden="true">
                        {cov ? '✓' : '✗'}
                      </span>
                      <span className="req-body">
                        <span className="sr-only">
                          {cov ? 'Satisfied: ' : 'Missing: '}
                        </span>
                        <span className="req-label">Required — </span>
                        {g?.title ?? gid}
                        {best ? (
                          <span className="req-detail">
                            {' '}
                            · best in group: {STATUS_LABELS[best]}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
                {i.requiredOneOfGroups?.map((orSet, idx) => {
                  const sat = orSet.some((gid) => {
                    const g = groupsById.get(gid)
                    return g ? groupHasCoverage(g, overrides) : false
                  })
                  const labels = orSet
                    .map((gid) => groupsById.get(gid)?.title ?? gid)
                    .join(', ')
                  return (
                    <li key={`or-${idx}`} className={sat ? 'req-ok' : 'req-bad'}>
                      <span className="req-icon" aria-hidden="true">
                        {sat ? '✓' : '✗'}
                      </span>
                      <span className="req-body">
                        <span className="sr-only">
                          {sat ? 'Satisfied: ' : 'Not satisfied: '}
                        </span>
                        <span className="req-label">At least one of — </span>
                        {labels}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>

      <h2 className="panel-heading panel-heading-spaced">Coverage matrix</h2>
      <p className="panel-lead muted">
        Scroll horizontally on small screens. Symbols are explained in the
        legend below.
      </p>
      <MatrixTable overrides={overrides} />
    </div>
  )
}

function MatrixTable({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
}) {
  const cols = useMemo(() => {
    const s = new Set<string>()
    for (const i of integrations) {
      i.requiredGroupIds.forEach((id) => s.add(id))
      i.requiredOneOfGroups?.forEach((arr) => arr.forEach((id) => s.add(id)))
    }
    return [...s].sort((a, b) => {
      const ta = groupsById.get(a)?.title ?? a
      const tb = groupsById.get(b)?.title ?? b
      return ta.localeCompare(tb)
    })
  }, [])

  return (
    <div className="matrix-block">
      <p className="matrix-narrow-hint">
        On a small screen, scroll sideways; the integration name column stays
        pinned.
      </p>
      <div className="matrix-wrap matrix-wrap-sticky">
        <table className="matrix">
          <caption className="matrix-caption">
            Integration spine vs section groups (active coverage only)
          </caption>
          <thead>
            <tr>
              <th scope="col">Integration</th>
              {cols.map((c) => (
                <th key={c} scope="col" title={groupsById.get(c)?.title ?? c}>
                  <span className="matrix-th-text">
                    {groupsById.get(c)?.title ?? c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {integrations.map((i) => (
              <tr key={i.id}>
                <th scope="row">{i.title}</th>
                {cols.map((gid) => {
                  const inRequired = i.requiredGroupIds.includes(gid)
                  const inOr = i.requiredOneOfGroups?.some((a) =>
                    a.includes(gid),
                  )
                  if (!inRequired && !inOr) {
                    return (
                      <td key={gid} className="cell-na">
                        <span aria-label="Not applicable">—</span>
                      </td>
                    )
                  }
                  const g = groupsById.get(gid)
                  const cov = g ? groupHasCoverage(g, overrides) : false
                  const cls = cov ? 'cell-ok' : 'cell-no'
                  const mark = inRequired ? (cov ? '●' : '○') : cov ? '◐' : '○'
                  const kind = inRequired ? 'Required' : 'Optional (OR set)'
                  const state = cov ? 'Active coverage' : 'No active coverage'
                  return (
                    <td
                      key={gid}
                      className={cls}
                      title={`${kind}. ${state}.`}
                    >
                      <span aria-label={`${kind}, ${state}`}>{mark}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="matrix-legend">
        <li>
          <span className="legend-sym" aria-hidden="true">
            ●
          </span>
          Required group, has coverage
        </li>
        <li>
          <span className="legend-sym" aria-hidden="true">
            ○
          </span>
          Required group, still missing coverage
        </li>
        <li>
          <span className="legend-sym" aria-hidden="true">
            ◐
          </span>
          Part of an "at least one" set; this group has coverage (others in the
          set may or may not)
        </li>
        <li>
          <span className="legend-sym muted" aria-hidden="true">
            —
          </span>
          Not used by that integration
        </li>
      </ul>
    </div>
  )
}
