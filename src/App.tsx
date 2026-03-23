import { useMemo, useState } from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from './data/registry'
import { useCoverageStore } from './hooks/useCoverageStore'
import type {
  ComponentItem,
  ComponentStatus,
  SectionGroup,
} from './types/lifeSystem'
import {
  STATUS_LABELS,
  bestGroupStatus,
  groupHasCoverage,
  integrationSatisfied,
  statusWeight,
} from './types/lifeSystem'
import './App.css'

type Tab = 'overview' | 'sections' | 'integrations' | 'gaps'

const KIND_CLASS: Record<SectionGroup['kind'], string> = {
  layer: 'kind-layer',
  domain: 'kind-domain',
  addon: 'kind-addon',
  future: 'kind-future',
}

const KIND_LABEL: Record<SectionGroup['kind'], string> = {
  layer: 'Core layer',
  domain: 'Life domain',
  addon: 'High-value add-on',
  future: 'Future',
}

const STATUSES = Object.keys(STATUS_LABELS) as ComponentStatus[]

function useStats(overrides: Record<string, ComponentStatus | undefined>) {
  return useMemo(() => {
    let total = 0
    const byStatus: Record<ComponentStatus, number> = {
      implemented: 0,
      external: 0,
      can_do: 0,
      in_progress: 0,
      planned: 0,
      not_started: 0,
    }
    for (const g of sectionGroups) {
      for (const c of g.components) {
        total++
        const s = overrides[c.id] ?? c.defaultStatus
        byStatus[s]++
      }
    }
    const active = [
      byStatus.implemented,
      byStatus.external,
      byStatus.can_do,
      byStatus.in_progress,
    ].reduce((a, b) => a + b, 0)
    const integrationOk = integrations.filter((i) =>
      integrationSatisfied(i, groupsById, overrides),
    ).length
    return { total, byStatus, active, integrationOk }
  }, [overrides])
}

function weakGroups(
  overrides: Record<string, ComponentStatus | undefined>,
): SectionGroup[] {
  return sectionGroups.filter(
    (g) => g.kind !== 'future' && !groupHasCoverage(g, overrides),
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { overrides, setStatus, clearOverride, resetAll } = useCoverageStore()
  const stats = useStats(overrides)

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sectionGroups.filter((g) => {
      if (kindFilter !== 'all' && g.kind !== kindFilter) return false
      if (!q) return true
      if (g.title.toLowerCase().includes(q)) return true
      return g.components.some(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.tool && c.tool.toLowerCase().includes(q)),
      )
    })
  }, [kindFilter, search])

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      overrides,
      registryVersion: 1,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ai-life-coverage.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="app-title">
              AI Life <span>Coverage</span>
            </h1>
            <p className="app-sub">
              Track every subsystem and whether your integration spine (daily
              brief, reflections, reports, decisions) has real signal from each
              area.
            </p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn btn-ghost" onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Reset overrides
            </button>
          </div>
        </div>
        <nav className="nav-tabs" aria-label="Main">
          {(
            [
              ['overview', 'Overview'],
              ['sections', 'Sections'],
              ['integrations', 'Integrations'],
              ['gaps', 'Gaps'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'true' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'overview' && (
          <OverviewPanel stats={stats} overrides={overrides} />
        )}
        {tab === 'sections' && (
          <SectionsPanel
            groups={filteredGroups}
            overrides={overrides}
            setStatus={setStatus}
            clearOverride={clearOverride}
            kindFilter={kindFilter}
            setKindFilter={setKindFilter}
            search={search}
            setSearch={setSearch}
          />
        )}
        {tab === 'integrations' && (
          <IntegrationsPanel overrides={overrides} />
        )}
        {tab === 'gaps' && <GapsPanel overrides={overrides} />}
      </main>
    </div>
  )
}

function OverviewPanel({
  stats,
  overrides,
}: {
  stats: ReturnType<typeof useStats>
  overrides: Record<string, ComponentStatus | undefined>
}) {
  const pct =
    stats.total > 0
      ? Math.round((stats.active / stats.total) * 100)
      : 0
  const intPct =
    integrations.length > 0
      ? Math.round((stats.integrationOk / integrations.length) * 100)
      : 0

  return (
    <div className="panel">
      <h2>System snapshot</h2>
      <div className="stats">
        <div className="stat-card">
          <strong>{stats.total}</strong>
          <span>Components</span>
        </div>
        <div className="stat-card">
          <strong>{pct}%</strong>
          <span>Active coverage</span>
        </div>
        <div className="stat-card">
          <strong>
            {stats.integrationOk}/{integrations.length}
          </strong>
          <span>Integrations ready</span>
        </div>
        <div className="stat-card">
          <strong>{intPct}%</strong>
          <span>Spine health</span>
        </div>
      </div>

      <h2>Status mix</h2>
      <div className="stats">
        {STATUSES.map((s) => (
          <div key={s} className="stat-card">
            <strong>{stats.byStatus[s]}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <h2>Integration spine</h2>
      <p className="app-sub" style={{ marginBottom: '0.75rem' }}>
        Each integration needs certain sections to be in an active state
        (implemented, external tool, can do, or in progress).
      </p>
      <div className="integration-cards">
        {integrations.map((i) => {
          const ok = integrationSatisfied(i, groupsById, overrides)
          return (
            <div
              key={i.id}
              className={`integration-card ${ok ? 'ok' : 'bad'}`}
            >
              <div>
                <strong>{i.title}</strong>
                <p>{i.description}</p>
              </div>
              <span className={`badge ${ok ? 'badge-ok' : 'badge-bad'}`}>
                {ok ? 'Ready' : 'Gaps'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionsPanel({
  groups,
  overrides,
  setStatus,
  clearOverride,
  kindFilter,
  setKindFilter,
  search,
  setSearch,
}: {
  groups: SectionGroup[]
  overrides: Record<string, ComponentStatus | undefined>
  setStatus: (id: string, s: ComponentStatus) => void
  clearOverride: (id: string) => void
  kindFilter: string
  setKindFilter: (v: string) => void
  search: string
  setSearch: (v: string) => void
}) {
  return (
    <div className="panel">
      <h2>All sections</h2>
      <div className="toolbar">
        <label>
          Kind
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by section kind"
          >
            <option value="all">All</option>
            <option value="layer">Core layers</option>
            <option value="domain">Domains</option>
            <option value="addon">Add-ons</option>
            <option value="future">Future</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            placeholder="Label, tool, section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {groups.map((g) => {
        const gBest = bestGroupStatus(g, overrides)
        return (
          <details key={g.id} className="group" open={groups.length <= 8}>
            <summary>
              <span>
                {g.title}
                {g.description ? (
                  <span className="group-meta"> — {g.description}</span>
                ) : null}
              </span>
              <span className={`group-meta ${KIND_CLASS[g.kind]}`}>
                {KIND_LABEL[g.kind]} · best:{' '}
                {STATUS_LABELS[gBest]}
              </span>
            </summary>
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Tool</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {g.components.map((c) => {
                  const cur = overrides[c.id] ?? c.defaultStatus
                  const dirty = overrides[c.id] !== undefined
                  return (
                    <tr key={c.id}>
                      <td>{c.label}</td>
                      <td>
                        {c.tool ? (
                          <span className="tool-tag">{c.tool}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <select
                          value={cur}
                          onChange={(e) =>
                            setStatus(c.id, e.target.value as ComponentStatus)
                          }
                          aria-label={`Status for ${c.label}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        {dirty ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              marginLeft: '0.35rem',
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.7rem',
                            }}
                            onClick={() => clearOverride(c.id)}
                          >
                            Default
                          </button>
                        ) : null}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                        {c.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </details>
        )
      })}
    </div>
  )
}

function IntegrationsPanel({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
}) {
  return (
    <div className="panel">
      <h2>Integration requirements</h2>
      <p className="app-sub" style={{ marginBottom: '1rem' }}>
        See exactly which section groups each spine integration expects, and
        whether your current statuses satisfy them.
      </p>
      <div className="integration-cards">
        {integrations.map((i) => {
          const ok = integrationSatisfied(i, groupsById, overrides)
          return (
            <article
              key={i.id}
              className={`integration-card ${ok ? 'ok' : 'bad'}`}
              style={{ flexDirection: 'column', alignItems: 'stretch' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.description}</p>
                </div>
                <span className={`badge ${ok ? 'badge-ok' : 'badge-bad'}`}>
                  {ok ? 'Satisfied' : 'Blocked'}
                </span>
              </div>
              <ul className="gap-list" style={{ marginTop: '0.75rem' }}>
                {i.requiredGroupIds.map((gid) => {
                  const g = groupsById.get(gid)
                  const cov = g
                    ? groupHasCoverage(g, overrides)
                    : false
                  const best = g ? bestGroupStatus(g, overrides) : undefined
                  return (
                    <li key={gid}>
                      <strong>{cov ? '✓' : '✗'}</strong>{' '}
                      {g?.title ?? gid}
                      {best ? (
                        <span style={{ color: 'var(--muted)' }}>
                          {' '}
                          ({STATUS_LABELS[best]})
                        </span>
                      ) : null}
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
                    <li key={`or-${idx}`}>
                      <strong>{sat ? '✓' : '✗'}</strong> At least one of:{' '}
                      {labels}
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>

      <h2 style={{ marginTop: '2rem' }}>Coverage matrix</h2>
      <p className="app-sub" style={{ marginBottom: '0.75rem' }}>
        Groups (columns) that appear in any integration rule. Cell shows whether
        that group currently has active coverage.
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
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th>Integration</th>
            {cols.map((c) => (
              <th key={c} title={c}>
                {(groupsById.get(c)?.title ?? c).slice(0, 22)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {integrations.map((i) => (
            <tr key={i.id}>
              <td>
                <strong>{i.title}</strong>
              </td>
              {cols.map((gid) => {
                const inRequired = i.requiredGroupIds.includes(gid)
                const inOr = i.requiredOneOfGroups?.some((a) =>
                  a.includes(gid),
                )
                if (!inRequired && !inOr) {
                  return (
                    <td key={gid} className="cell-na">
                      —
                    </td>
                  )
                }
                const g = groupsById.get(gid)
                const cov = g ? groupHasCoverage(g, overrides) : false
                const cls = cov ? 'cell-ok' : 'cell-no'
                const mark = inRequired ? (cov ? '●' : '○') : cov ? '◐' : '○'
                return (
                  <td key={gid} className={cls} title={inOr ? 'OR group' : 'Required'}>
                    {mark}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GapsPanel({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
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

  return (
    <div className="panel">
      <h2>Section groups with no active coverage</h2>
      <p className="app-sub" style={{ marginBottom: '0.75rem' }}>
        A group is “quiet” when every component is only planned or not started.
        Feed these first if you want richer briefs and reports.
      </p>
      {weak.length === 0 ? (
        <p className="empty-hint">Every life-domain group has some signal.</p>
      ) : (
        <ul className="gap-list">
          {weak.map((g) => (
            <li key={g.id}>
              <strong>{g.title}</strong> — add an implemented tool, mark
              something in progress, or promote a “can do” item.
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: '2rem' }}>Integration blockers</h2>
      {integrations.every((i) =>
        integrationSatisfied(i, groupsById, overrides),
      ) ? (
        <p className="empty-hint">All spine integrations are satisfied.</p>
      ) : (
        <ul className="gap-list">
          {integrations
            .filter((i) => !integrationSatisfied(i, groupsById, overrides))
            .map((i) => (
              <li key={i.id}>
                <strong>{i.title}</strong> — missing feeds; open the
                Integrations tab for the checklist.
              </li>
            ))}
        </ul>
      )}

      <h2 style={{ marginTop: '2rem' }}>
        Components still planned / not started
      </h2>
      <p className="app-sub" style={{ marginBottom: '0.75rem' }}>
        Sorted with weakest status first (within planned vs not started).
      </p>
      <ul className="gap-list">
        {noSignal.slice(0, 40).map(({ group, comp }) => {
          const s: ComponentStatus = overrides[comp.id] ?? comp.defaultStatus
          return (
            <li key={comp.id}>
              <strong>{group.title}</strong>: {comp.label}{' '}
              <span style={{ color: 'var(--muted)' }}>
                ({STATUS_LABELS[s]})
              </span>
            </li>
          )
        })}
      </ul>
      {noSignal.length > 40 ? (
        <p className="empty-hint">
          +{noSignal.length - 40} more — use Search on the Sections tab.
        </p>
      ) : null}
    </div>
  )
}

export default App
