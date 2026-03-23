import { useCallback, useMemo, useState, type KeyboardEvent } from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from './data/registry'
import { useCoverageStore } from './hooks/useCoverageStore'
import type {
  CategorySelfMetrics,
  ComponentItem,
  ComponentStatus,
  SectionGroup,
  SectionKind,
} from './types/lifeSystem'
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  bestGroupStatus,
  groupHasCoverage,
  groupSignalPercent,
  integrationSatisfied,
  isActiveCoverage,
  statusWeight,
} from './types/lifeSystem'
import './App.css'

type Tab = 'overview' | 'mastery' | 'sections' | 'integrations' | 'gaps'

const KIND_SORT: SectionKind[] = ['layer', 'domain', 'addon', 'future']

const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    description:
      'High-level counts, status mix, and whether your four spine integrations are fed.',
  },
  {
    id: 'mastery',
    label: 'Mastery',
    description:
      'Your proficiency and how complete each catalog category feels — saved in this browser.',
  },
  {
    id: 'sections',
    label: 'Sections',
    description:
      'Browse layers and domains — including Projects (CSV catalog) from projects-2026-03-23.csv.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description:
      'Checklists and matrix for Daily brief, Evening reflection, Weekly report, and Decision engine.',
  },
  {
    id: 'gaps',
    label: 'Gaps',
    description:
      'Quiet groups, blocked integrations, and backlog items to prioritize next.',
  },
]

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

const GITHUB_USER = 'hondoentertainment'

function githubRepoHref(repo: string): string {
  return `https://github.com/${GITHUB_USER}/${encodeURIComponent(repo)}`
}

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

function countActiveComponentsInGroup(
  g: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): number {
  return g.components.filter((c) =>
    isActiveCoverage(overrides[c.id] ?? c.defaultStatus),
  ).length
}

function statusToneClass(s: ComponentStatus): string {
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

function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const {
    overrides,
    categoryMetrics,
    setStatus,
    clearOverride,
    setCategoryMetric,
    resetAll,
  } = useCoverageStore()
  const stats = useStats(overrides)

  const tabIds = TABS.map((t) => t.id)
  const activeTabMeta = TABS.find((t) => t.id === tab)!

  const onTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const i = tabIds.indexOf(tab)
      if (i < 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setTab(tabIds[(i + 1) % tabIds.length])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setTab(tabIds[(i - 1 + tabIds.length) % tabIds.length])
      } else if (e.key === 'Home') {
        e.preventDefault()
        setTab(tabIds[0])
      } else if (e.key === 'End') {
        e.preventDefault()
        setTab(tabIds[tabIds.length - 1])
      }
    },
    [tab, tabIds],
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sectionGroups.filter((g) => {
      if (kindFilter !== 'all' && g.kind !== kindFilter) return false
      if (!q) return true
      if (g.title.toLowerCase().includes(q)) return true
      return g.components.some((c) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (c.tool?.toLowerCase().includes(q)) return true
        if (c.repo?.toLowerCase().includes(q)) return true
        if (c.repoUrl?.toLowerCase().includes(q)) return true
        if (c.locationUrl?.toLowerCase().includes(q)) return true
        if (c.notes?.toLowerCase().includes(q)) return true
        return false
      })
    })
  }, [kindFilter, search])

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      overrides,
      categoryMetrics,
      registryVersion: 3,
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

  const blockedCount =
    integrations.length -
    integrations.filter((i) => integrationSatisfied(i, groupsById, overrides))
      .length

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
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
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all status overrides and category mastery (proficiency / % complete) in this browser?',
                  )
                ) {
                  resetAll()
                }
              }}
              aria-describedby="reset-help"
            >
              Reset overrides
            </button>
            <span id="reset-help" className="visually-hidden">
              Clears overrides and mastery scores in local storage; does not
              delete the app.
            </span>
          </div>
        </div>
        <nav
          className="nav-tabs"
          role="tablist"
          aria-label="Primary views"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls="main-content"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKeyDown}
            >
              {label}
            </button>
          ))}
        </nav>
        <p className="tab-context" role="status" aria-live="polite">
          {activeTabMeta.description}
        </p>
      </header>

      <main
        id="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={-1}
      >
        {tab === 'overview' && (
          <OverviewPanel
            stats={stats}
            overrides={overrides}
            categoryMetrics={categoryMetrics}
            blockedCount={blockedCount}
            onGoIntegrations={() => setTab('integrations')}
            onGoGaps={() => setTab('gaps')}
            onGoSections={() => setTab('sections')}
            onGoMastery={() => setTab('mastery')}
          />
        )}
        {tab === 'mastery' && (
          <MasteryPanel
            overrides={overrides}
            categoryMetrics={categoryMetrics}
            setCategoryMetric={setCategoryMetric}
          />
        )}
        {tab === 'sections' && (
          <SectionsPanel
            key={kindFilter}
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
        {tab === 'gaps' && (
          <GapsPanel
            overrides={overrides}
            onGoSections={() => setTab('sections')}
            onGoIntegrations={() => setTab('integrations')}
          />
        )}
      </main>
    </div>
  )
}

function clampPctInput(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function masteryAverages(categoryMetrics: Record<string, CategorySelfMetrics>) {
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

function MasteryPanel({
  overrides,
  categoryMetrics,
  setCategoryMetric,
}: {
  overrides: Record<string, ComponentStatus | undefined>
  categoryMetrics: Record<string, CategorySelfMetrics>
  setCategoryMetric: (
    groupId: string,
    field: 'proficiency' | 'percentComplete',
    value: number | undefined,
  ) => void
}) {
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('all')

  const sortedGroups = useMemo(() => {
    return [...sectionGroups].sort((a, b) => {
      const ia = KIND_SORT.indexOf(a.kind)
      const ib = KIND_SORT.indexOf(b.kind)
      if (ia !== ib) return ia - ib
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sortedGroups.filter((g) => {
      if (kindFilter !== 'all' && g.kind !== kindFilter) return false
      if (!q) return true
      if (g.title.toLowerCase().includes(q)) return true
      if (g.description?.toLowerCase().includes(q)) return true
      if (KIND_LABEL[g.kind].toLowerCase().includes(q)) return true
      return false
    })
  }, [sortedGroups, kindFilter, search])

  return (
    <div className="panel">
      <h2 className="panel-heading">Category mastery</h2>
      <p className="panel-lead muted">
        Rate each catalog category (0–100). Leave a field empty to leave it
        unset. <strong>Signal %</strong> is computed from how many components
        in that group have active coverage in Sections.
      </p>

      <div className="toolbar toolbar-wrap">
        <label className="field">
          <span className="field-label">Kind</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by section kind"
          >
            <option value="all">All kinds</option>
            <option value="layer">Core layers</option>
            <option value="domain">Life domains</option>
            <option value="addon">Add-ons</option>
            <option value="future">Future</option>
          </select>
        </label>
        <label className="field field-grow">
          <span className="field-label">Search</span>
          <input
            type="search"
            placeholder="Category title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search categories"
          />
        </label>
      </div>

      <p className="results-line" aria-live="polite">
        Showing <strong>{filtered.length}</strong> of {sectionGroups.length}{' '}
        categories
        {search.trim() ? ` matching “${search.trim()}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches. Try clearing search or choosing “All kinds”.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="comp-table mastery-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Kind</th>
                <th scope="col">Your proficiency</th>
                <th scope="col">Your % complete</th>
                <th scope="col">Signal %</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const m = categoryMetrics[g.id] ?? {}
                const signal = groupSignalPercent(g, overrides)
                return (
                  <tr key={g.id}>
                    <th scope="row" className="comp-name mastery-cat-cell">
                      <span className="mastery-cat-title">{g.title}</span>
                      {g.description ? (
                        <span className="mastery-cat-desc">{g.description}</span>
                      ) : null}
                    </th>
                    <td>
                      <span className={`kind-pill ${KIND_CLASS[g.kind]}`}>
                        {KIND_LABEL[g.kind]}
                      </span>
                    </td>
                    <td className="mastery-input-cell">
                      <input
                        type="number"
                        className="mastery-num"
                        min={0}
                        max={100}
                        step={1}
                        value={m.proficiency ?? ''}
                        onChange={(e) => {
                          const t = e.target.value.trim()
                          if (t === '') {
                            setCategoryMetric(g.id, 'proficiency', undefined)
                            return
                          }
                          const n = Number.parseInt(t, 10)
                          if (Number.isNaN(n)) return
                          setCategoryMetric(
                            g.id,
                            'proficiency',
                            clampPctInput(n),
                          )
                        }}
                        aria-label={`Proficiency percent for ${g.title}`}
                        placeholder="—"
                      />
                      <span className="mastery-unit">%</span>
                    </td>
                    <td className="mastery-input-cell">
                      <input
                        type="number"
                        className="mastery-num"
                        min={0}
                        max={100}
                        step={1}
                        value={m.percentComplete ?? ''}
                        onChange={(e) => {
                          const t = e.target.value.trim()
                          if (t === '') {
                            setCategoryMetric(
                              g.id,
                              'percentComplete',
                              undefined,
                            )
                            return
                          }
                          const n = Number.parseInt(t, 10)
                          if (Number.isNaN(n)) return
                          setCategoryMetric(
                            g.id,
                            'percentComplete',
                            clampPctInput(n),
                          )
                        }}
                        aria-label={`Percent complete for ${g.title}`}
                        placeholder="—"
                      />
                      <span className="mastery-unit">%</span>
                    </td>
                    <td className="mastery-signal-cell">
                      <div className="mastery-signal-row">
                        <span className="mastery-signal-val">{signal}%</span>
                        <div
                          className="progress-bar mastery-signal-bar"
                          role="presentation"
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${signal}%` }}
                          />
                        </div>
                      </div>
                      <span className="mastery-signal-hint">
                        {g.components.length} component
                        {g.components.length === 1 ? '' : 's'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OverviewPanel({
  stats,
  overrides,
  categoryMetrics,
  blockedCount,
  onGoIntegrations,
  onGoGaps,
  onGoSections,
  onGoMastery,
}: {
  stats: ReturnType<typeof useStats>
  overrides: Record<string, ComponentStatus | undefined>
  categoryMetrics: Record<string, CategorySelfMetrics>
  blockedCount: number
  onGoIntegrations: () => void
  onGoGaps: () => void
  onGoSections: () => void
  onGoMastery: () => void
}) {
  const pct =
    stats.total > 0
      ? Math.round((stats.active / stats.total) * 100)
      : 0
  const intPct =
    integrations.length > 0
      ? Math.round((stats.integrationOk / integrations.length) * 100)
      : 0

  const weak = weakGroups(overrides)
  const {
    avgProficiency,
    avgPercentComplete,
    profCount,
    completeCount,
  } = useMemo(() => masteryAverages(categoryMetrics), [categoryMetrics])

  const avgSignalAcrossCategories = useMemo(() => {
    if (sectionGroups.length === 0) return 0
    const sum = sectionGroups.reduce(
      (acc, g) => acc + groupSignalPercent(g, overrides),
      0,
    )
    return Math.round(sum / sectionGroups.length)
  }, [overrides])

  const hasAnyMastery =
    profCount > 0 || completeCount > 0

  return (
    <div className="panel">
      <h2 className="panel-heading">System snapshot</h2>
      <p className="panel-lead">
        <strong>Active coverage</strong> counts components marked Implemented,
        External tool, Can do, or In progress — those feed your integration
        spine. Planned and Not started do not.
      </p>

      <div className="stats stats-primary">
        <div className="stat-card">
          <strong>{stats.total}</strong>
          <span>Total components</span>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-row">
            <strong>{pct}%</strong>
            <span className="stat-sub">active</span>
          </div>
          <span className="stat-label">Coverage</span>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Percent of components with active coverage"
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-row">
            <strong>
              {stats.integrationOk}/{integrations.length}
            </strong>
            <span className="stat-sub">ready</span>
          </div>
          <span className="stat-label">Spine integrations</span>
          <div
            className="progress-bar progress-bar-amber"
            role="progressbar"
            aria-valuenow={intPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Percent of integrations fully satisfied"
          >
            <div className="progress-fill" style={{ width: `${intPct}%` }} />
          </div>
        </div>
      </div>

      <h2 className="panel-heading panel-heading-spaced">Catalog mastery</h2>
      <p className="panel-lead muted">
        Self-rated <strong>proficiency</strong> and <strong>% complete</strong>{' '}
        per category (section group). <strong>Signal</strong> is derived from
        component statuses in Sections.
      </p>
      <div className="stats stats-mix mastery-overview-stats">
        <div className="stat-card stat-card-compact">
          <strong>
            {avgProficiency !== null ? `${avgProficiency}%` : '—'}
          </strong>
          <span>
            Avg proficiency
            {profCount > 0 ? ` (${profCount} set)` : ''}
          </span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>
            {avgPercentComplete !== null ? `${avgPercentComplete}%` : '—'}
          </strong>
          <span>
            Avg your % complete
            {completeCount > 0 ? ` (${completeCount} set)` : ''}
          </span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>{avgSignalAcrossCategories}%</strong>
          <span>Avg signal (all categories)</span>
        </div>
      </div>
      <p className="panel-lead muted catalog-hint">
        <button type="button" className="link-btn" onClick={onGoMastery}>
          Edit per category
        </button>
        <span className="catalog-hint-detail">
          {' '}
          · {sectionGroups.length} categories in the catalog
          {hasAnyMastery ? '' : ' — no scores saved yet'}
        </span>
      </p>

      <p className="panel-lead muted catalog-hint">
        <button type="button" className="link-btn" onClick={onGoSections}>
          Open Sections
        </button>
        <span className="catalog-hint-detail">
          {' '}
          · CSV exports appear as <strong>Projects (CSV catalog)</strong> (Life
          domain). Source:{' '}
          <code className="inline-code">projects-2026-03-23.csv</code>
        </span>
      </p>

      {(blockedCount > 0 || weak.length > 0) && (
        <div className="callout callout-warn" role="region" aria-label="Suggested next steps">
          <p className="callout-title">Suggested next steps</p>
          <ul className="callout-actions">
            {blockedCount > 0 ? (
              <li>
                <button type="button" className="link-btn" onClick={onGoIntegrations}>
                  Fix {blockedCount} blocked integration{blockedCount === 1 ? '' : 's'}
                </button>
              </li>
            ) : null}
            {weak.length > 0 ? (
              <li>
                <button type="button" className="link-btn" onClick={onGoGaps}>
                  Review {weak.length} quiet section group{weak.length === 1 ? '' : 's'}
                </button>
              </li>
            ) : null}
            <li>
              <button type="button" className="link-btn" onClick={onGoSections}>
                Update statuses in Sections
              </button>
            </li>
          </ul>
        </div>
      )}

      <h2 className="panel-heading">Status mix</h2>
      <p className="panel-lead muted">
        Hover a status in <strong>Sections</strong> for a short definition.
      </p>
      <div className="stats stats-mix">
        {STATUSES.map((s) => (
          <div key={s} className="stat-card stat-card-compact" title={STATUS_DESCRIPTIONS[s]}>
            <strong>{stats.byStatus[s]}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <h2 className="panel-heading">Integration spine</h2>
      <p className="panel-lead muted">
        Each card turns green when every required section group has active
        signal (same rule as Coverage above).
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
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const defaultOpen = groups.length <= 6
  const getOpen = (id: string) =>
    id in openMap ? openMap[id]! : defaultOpen

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    groups.forEach((g) => {
      next[g.id] = true
    })
    setOpenMap(next)
  }

  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    groups.forEach((g) => {
      next[g.id] = false
    })
    setOpenMap(next)
  }

  const totalSections = sectionGroups.length
  const totalComponents = sectionGroups.reduce(
    (n, g) => n + g.components.length,
    0,
  )

  return (
    <div className="panel">
      <h2 className="panel-heading">Sections</h2>
      <p className="panel-lead muted">
        Default statuses and repo links mirror{' '}
        <a
          href={`https://github.com/${GITHUB_USER}`}
          target="_blank"
          rel="noreferrer"
          className="inline-link"
        >
          github.com/{GITHUB_USER}
        </a>
        . Open a group to edit; use <strong>Reset overrides</strong> to reload
        defaults after a registry update.
      </p>

      <div className="toolbar toolbar-wrap">
        <label className="field">
          <span className="field-label">Kind</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by section kind"
          >
            <option value="all">All kinds</option>
            <option value="layer">Core layers</option>
            <option value="domain">Life domains</option>
            <option value="addon">Add-ons</option>
            <option value="future">Future</option>
          </select>
        </label>
        <label className="field field-grow">
          <span className="field-label">Search</span>
          <input
            type="search"
            placeholder="Section, component, tool, or repo name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sections and components"
          />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-sm" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      <p className="results-line" aria-live="polite">
        Showing <strong>{groups.length}</strong> of {totalSections} sections (
        {totalComponents} components total)
        {search.trim() ? ` matching “${search.trim()}”` : ''}
      </p>

      {groups.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches this filter. Try clearing search or choosing “All
          kinds”.
        </p>
      ) : null}

      {groups.map((g) => {
        const gBest = bestGroupStatus(g, overrides)
        const activeN = countActiveComponentsInGroup(g, overrides)
        const totalN = g.components.length
        return (
          <details
            key={g.id}
            className="group"
            open={getOpen(g.id)}
            onToggle={(e) => {
              const el = e.currentTarget
              setOpenMap((m) => ({ ...m, [g.id]: el.open }))
            }}
          >
            <summary>
              <span className="summary-main">
                <span className="summary-title">{g.title}</span>
                {g.description ? (
                  <span className="group-meta"> — {g.description}</span>
                ) : null}
              </span>
              <span className="summary-meta">
                <span className={`kind-pill ${KIND_CLASS[g.kind]}`}>
                  {KIND_LABEL[g.kind]}
                </span>
                <span className="group-count" title="Active components in this group">
                  {activeN}/{totalN} active
                </span>
                <span className={`status-pill ${statusToneClass(gBest)}`}>
                  Best: {STATUS_LABELS[gBest]}
                </span>
              </span>
            </summary>
            <div className="table-scroll">
              <table className="comp-table">
                <thead>
                  <tr>
                    <th scope="col">Component</th>
                    <th scope="col">Repo</th>
                    <th scope="col">Tool</th>
                    <th scope="col">Status</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {g.components.map((c) => {
                    const cur = overrides[c.id] ?? c.defaultStatus
                    const dirty = overrides[c.id] !== undefined
                    return (
                      <tr key={c.id} className={`row-status ${statusToneClass(cur)}`}>
                        <th scope="row" className="comp-name">
                          {c.label}
                        </th>
                        <td>
                          {c.repoUrl || c.repo || c.locationUrl ? (
                            <div className="repo-links-stack">
                              {c.repoUrl ? (
                                <a
                                  className="repo-link"
                                  href={c.repoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Repository
                                </a>
                              ) : c.repo ? (
                                <a
                                  className="repo-link"
                                  href={githubRepoHref(c.repo)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {c.repo}
                                </a>
                              ) : null}
                              {c.locationUrl ? (
                                <a
                                  className="repo-link repo-link-secondary"
                                  href={c.locationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Location URL
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <span className="cell-empty">—</span>
                          )}
                        </td>
                        <td>
                          {c.tool ? (
                            <span className="tool-tag">{c.tool}</span>
                          ) : (
                            <span className="cell-empty">—</span>
                          )}
                        </td>
                        <td className="cell-status">
                          <select
                            value={cur}
                            title={STATUS_DESCRIPTIONS[cur]}
                            onChange={(e) =>
                              setStatus(c.id, e.target.value as ComponentStatus)
                            }
                            aria-label={`Status for ${c.label}. ${STATUS_DESCRIPTIONS[cur]}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s} title={STATUS_DESCRIPTIONS[s]}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {dirty ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => clearOverride(c.id)}
                            >
                              Use default
                            </button>
                          ) : null}
                        </td>
                        <td className="cell-notes">
                          {c.notes ?? <span className="cell-empty">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
      <h2 className="panel-heading">Integration requirements</h2>
      <p className="panel-lead muted">
        Required groups must all have active coverage. “At least one of” rows
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
      <div className="matrix-wrap">
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
          Part of an “at least one” set; this group has coverage (others in the
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

function GapsPanel({
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
              progress, or promote a “can do” item in{' '}
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
    </div>
  )
}

export default App
